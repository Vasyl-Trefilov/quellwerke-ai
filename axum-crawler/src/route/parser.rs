use futures::stream::{self, StreamExt};
use axum::{
    routing::post,
    Extension, Json, Router,
    http::StatusCode,
};

// Used to convert data => json and reverse
use serde::{Deserialize, Serialize};

// Used to create SQL requests 
use sqlx::PgPool;
use std::sync::Arc;
use reqwest::Client;

// handel json 
use serde_json;
use serde_json::json;
use crate::route;

// As i said we use this state on the hole project 
use crate::state::AppState;

// Debug used to allow logging, Clone is allowing to clone, Deserialize to convert json => data(when we receive json body)
#[derive(Debug, Deserialize, Clone)]
pub struct CrawlRequest {
    url: String,
    lang: String,
    title: String,
}

// Serialize converting data => json(to send response in json format)
#[derive(Debug, Serialize)]
pub struct CrawlResponse {
    chunks: usize,
}

// routes from this file, so every route will be /parser/{route_name}
pub fn parser_routes(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/parse-url", post(crawl_url))
        .layer(Extension(state))
}

/*  
    receive the MAIN url 
    example: https://example.com NOT https://example.com/something, pls only main one
    land and title just for database, maybe used for analytics 
*/
async fn crawl_url(
    Extension(state): Extension<Arc<AppState>>,
    Json(payload): Json<CrawlRequest>,
) -> Result<Json<CrawlResponse>, (StatusCode, String)> {
    println!("Request came");
    // getting db 
    let pool: &PgPool = &state.db;

    // creating client to make request( like axios in js )
    let client = Client::new();

    // parsing ulrs and creating chunks for future inserting in DBs  
    let result = route::parserhandler::crawl_site(&payload.url, 200).await;
    println!("Crawled {} pages, got {} chunks", result.pages, result.chunks.len());
    
    // let json = serde_json::to_string_pretty(&result.chunks)
    //     .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("JSON serialization error: {}", e)))?;

    // tokio::fs::write("output.json", json).await
    //     .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("File write error: {}", e)))?;
    
    println!("Wrote output");
    // Insert into documents and return doc_id to use it in next DBs requests
    let row: (i32,) = sqlx::query_as(
        r#"
        INSERT INTO documents (source_type, source_uri, title, lang)
        VALUES ($1, $2, $3, $4)
        RETURNING doc_id
        "#
    )
    .bind("website")
    .bind(&payload.url)
    .bind(&payload.title)
    .bind(&payload.lang)
    .fetch_one(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let doc_id = row.0;

    // Ensure Qdrant collection exists( good thing if you testing clear docker a lot of times ) qdrant
    let qdrant_url = "http://qdrant:6333";
    let collection_name = "kb_v1";
    let res = client
        .get(format!("{}/collections/{}", qdrant_url, collection_name))
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    // Creating collection FOR 768 DIMENSIONS!!! if you use other embedding model for vector pls, write correct number of dimensions below
    if res.status() == StatusCode::NOT_FOUND {
        client.put(format!("{}/collections/{}", qdrant_url, collection_name))
            .json(&json!({
                "vectors": { "size": 768, "distance": "Cosine" },
                "optimizers_config": { "default_segment_number": 2 },
                "params": { "on_disk_payload": true },
                "hnsw_config": { "m": 16, "ef_construct": 100 }
            }))
            .send()
            .await
            .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    }

    // clone chunks into owned Vec so async blocks don’t borrow
    let chunks: Vec<(usize, String)> = result
        .chunks
        .iter()
        .cloned()
        .enumerate()
        .collect();

    // sadly this will not give big difference, bc of fucking docker, but if you use it on localhost, without docker it will make really big difference, this is threads btw
    let concurrency = 5; // adjust based on resources

    stream::iter(chunks)
        .map(|(i, chunk)| {
            let client = client.clone();
            let pool = pool.clone();
            let payload = payload.clone();
            async move {
                println!("Inserting chunk {} ({} chars)", i + 1, chunk.chars().count());

                // request embedding from Ollama via Ollama server, but you can also use std::process::Command to run model one time, BUT I am not recommending to do this when you make a lot of requests, only for rare one time requests to save RAM( money for hosting )
                // can be switched to OpenAi version, for example text-embedding-3-small or text-embedding-3-large, this will reduce RAM usage, but will cost some money
                // I recommend using local model to not depending on Api and embedding model like that uses really low RAM, something around 200mb, this is not a big deal and its much faster then OpenAi, bc working local
                let emb_res = client.post("http://ollama:11434/api/embeddings")
                    .json(&json!({
                        "model": "nomic-embed-text:v1.5",
                        "prompt": chunk
                    }))
                    .send()
                    .await
                    .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

                // converting vector to json format
                let emb_json: serde_json::Value = emb_res.json()
                    .await
                    .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

                // converting back to vector, bc why not 
                let vector: Vec<f64> = emb_json["embedding"]
                    .as_array()
                    .ok_or((StatusCode::BAD_GATEWAY, "missing embedding".to_string()))?
                    .iter()
                    .map(|v| v.as_f64().unwrap_or(0.0))  // or return error if any value is not f64
                    .collect();


                // Insert chunk into Postgres and return chunk_id to create chunk in Qdrant with same id
                let row: (i32,) = sqlx::query_as(
                    r#"
                    INSERT INTO chunks (doc_id, chunk_index, text, tokens, embedding_version)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING chunk_id
                    "#
                )
                .bind(doc_id)
                .bind((i + 1) as i32)
                .bind(&chunk)
                .bind(chunk.len() as i32)
                .bind("0.0.1")
                .fetch_one(&pool)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

                let chunk_id = row.0;
                // creating preview, to search for text manually if needed, but not saving the hole text to leave high performance
                let preview: String = chunk.chars().take(50).collect();

                // ---- Insert into Qdrant ----
               // ---- Insert into Qdrant ----
                let res = client
                    .put(format!("{}/collections/{}/points", qdrant_url, collection_name))
                    .json(&json!({
                        "points": [{
                            "id": chunk_id,
                            "vector": vector,
                            "payload": {
                                "doc_id": doc_id,
                                "chunk_id": chunk_id,
                                "chunk_index": i + 1,
                                "title": payload.title,
                                "lang": payload.lang,
                                "preview": preview,
                                "version": "0.0.1"
                            }
                        }]
                    }))
                    .send()
                    .await
                    .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

                // log status and body for debugging
                let status = res.status();
                let body = res.text().await.unwrap_or_else(|_| "<no body>".to_string());
                println!("Qdrant insert response (status={}): {}", status, body);

                // check for failure
                if !status.is_success() {
                    return Err((StatusCode::BAD_GATEWAY, format!("Qdrant insert failed: {}", body)));
                }


                Ok::<(), (StatusCode, String)>(())
            }
        })
        .buffer_unordered(concurrency)
        .collect::<Vec<_>>()
        .await;

    Ok(Json(CrawlResponse {
        chunks: result.chunks.len(),
    }))
}
