// importing other routes 
pub mod parser;
pub mod parserhandler;

use axum::{routing::get, Json};
use axum::Router;
use std::sync::Arc;
// Using this state to provide it to other routes, without it, you will not able to use postgres 
use crate::state::AppState;

// Used to converting Data to Json to send back response 
use serde::Serialize;
#[derive(Serialize)]

// This is just some test routes 
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

// Used to create other other routes from other files
pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(health_check))      // GET /health route
        .route("/hello", get(hello))
        // Using route from parser.rs
        .nest("/parser", parser::parser_routes(state.clone()))
}