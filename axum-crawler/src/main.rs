mod route;
mod state;
mod db;
use std::{sync::Arc};
use state::AppState;
use crate::route::create_router; 
use dotenv::dotenv;
use tower_http::cors::{CorsLayer, Any};
use axum::{http::{Method, header}};


// This is just axum server version 0.8.4
#[tokio::main]
async fn main() {

    dotenv().ok();
    let pool = db::init_db().await;

    let state = Arc::new(AppState { db: pool});

    let cors = CorsLayer::new()
        .allow_origin(Any)
        // .allow_origin("http://localhost:3000".parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);
        // .allow_credentials(true);

    let app = create_router(state).layer(cors);

    println!("🚀 Server started successfully");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:4000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
