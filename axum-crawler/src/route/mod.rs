// importing other routes 
pub mod parser;
pub mod parserhandler;

use axum::{routing::get, Json};
use axum::Router;
use std::sync::Arc;
use axum_prometheus::PrometheusMetricLayer;
use tower_http::trace::TraceLayer;

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

#[derive(Serialize)]
struct HelloResponse {
    message: String,
}

async fn hello() -> Json<HelloResponse> {
    Json(HelloResponse {
        message: "Hello, World!".to_string(),
    })
}

pub fn create_router(state: Arc<AppState>) -> Router {
    // Build Prometheus metric layer
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let metric_handle = Arc::new(metric_handle);

    Router::new()
        .route("/health", get(health_check))
        .route("/hello", get(hello))
        .nest("/parser", parser::parser_routes(state.clone()))
        .route("/metrics", {
            let mh = metric_handle.clone();
            get(move || {
                let mh = mh.clone();
                async move { mh.render() }
            })
        })
        .layer(prometheus_layer)
        .layer(TraceLayer::new_for_http())
}
