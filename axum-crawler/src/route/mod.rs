pub mod parser;
pub mod parserhandler;
use axum::{routing::get, Json};
use axum::Router;
use std::sync::Arc;
use crate::state::AppState;
use serde::Serialize;
#[derive(Serialize)]
struct TestResponse {
    message: String,
}

async fn health_check() -> Json<TestResponse> {
    Json(TestResponse {
        message: "Server is up and running!".to_string(),
    })
}

async fn hello() -> &'static str {
    "Hello from test route!"
}

pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(health_check))      // GET /health route
        .route("/hello", get(hello))
        .nest("/parser", parser::parser_routes(state.clone()))
}