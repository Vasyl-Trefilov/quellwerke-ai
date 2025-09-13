use sqlx::PgPool;
use serde::Serialize;
use tokio::fs;
mod state;
mod db;
use std::{sync::Arc};
use state::AppState;
use dotenv::dotenv;

#[derive(Serialize)]
struct Chunk {
    id: i32,
    text: String,
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    let pool = db::init_db().await;

    let state = Arc::new(AppState { db: pool});
    export_chunks(&state.db, "chunks.json").await.unwrap();

}

pub async fn export_chunks(pool: &PgPool, file: &str) -> anyhow::Result<()> {
    // Fetch chunks from DB
    let rows: Vec<(i32, String)> = sqlx::query_as(
        r#"
        SELECT chunk_id, text
        FROM chunks
        WHERE doc_id = 2
        ORDER BY chunk_id
        "#
    )
    .fetch_all(pool)
    .await?;

    // Convert to Vec<Chunk>
    let chunks: Vec<Chunk> = rows
        .into_iter()
        .map(|(id, text)| Chunk { id, text })
        .collect();

    // Serialize to JSON
    let json = serde_json::to_string_pretty(&chunks)?;

    // Write to file
    fs::write(file, json).await?;

    println!("✅ Exported {} chunks to {}", chunks.len(), file);
    Ok(())
}