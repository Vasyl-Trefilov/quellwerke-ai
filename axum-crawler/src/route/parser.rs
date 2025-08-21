use futures::stream::{self, StreamExt};
use axum::{
    routing::post,
    Extension, Json, Router,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use reqwest::Client;
use serde_json::json;
use crate::route;

use crate::state::AppState;

#[derive(Debug, Deserialize, Clone)]
pub struct CrawlRequest {
    url: String,
    lang: String,
    title: String,
}

#[derive(Debug, Serialize)]
pub struct CrawlResponse {
    chunks: usize,
}

pub fn parser_routes(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/parse-url", post(crawl_url))
        .layer(Extension(state))
}

async fn crawl_url(
    Extension(state): Extension<Arc<AppState>>,
    Json(payload): Json<CrawlRequest>,
) -> Result<Json<CrawlResponse>, (StatusCode, String)> {
    let pool: &PgPool = &state.db;
    let client = Client::new();

    let result = route::parserhandler::crawl_site(&payload.url, 200).await;
    println!("Crawled {} pages, got {} chunks", result.pages, result.chunks.len());

    // ---- Insert into documents ----
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

    // ---- Ensure Qdrant collection exists ----
    let qdrant_url = "http://localhost:6333";
    let collection_name = "kb_v1";
    let res = client
        .get(format!("{}/collections/{}", qdrant_url, collection_name))
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

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

    let concurrency = 5; // adjust based on resources

    stream::iter(chunks)
        .map(|(i, chunk)| {
            let client = client.clone();
            let pool = pool.clone();
            let payload = payload.clone();
            async move {
                println!("Inserting chunk {} ({} chars)", i + 1, chunk.chars().count());

                // ---- request embedding from Ollama ----
                let emb_res = client.post("http://localhost:11435/api/embeddings")
                    .json(&json!({
                        "model": "nomic-embed-text:v1.5",
                        "prompt": chunk
                    }))
                    .send()
                    .await
                    .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

                let emb_json: serde_json::Value = emb_res.json()
                    .await
                    .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

                let vector = emb_json["embedding"].as_array()
                    .ok_or((StatusCode::BAD_GATEWAY, "missing embedding".to_string()))?;

                // ---- Insert chunk into Postgres ----
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
                let preview: String = chunk.chars().take(50).collect();

                // ---- Insert into Qdrant ----
                client.put(format!("{}/collections/{}/points", qdrant_url, collection_name))
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
