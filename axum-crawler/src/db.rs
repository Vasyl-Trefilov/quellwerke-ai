use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use dotenv::dotenv;

pub async fn init_db() -> Pool<Postgres> {
    dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    PgPoolOptions::new()
        .max_connections(3)
        .connect(&database_url)
        .await
        .expect("Failed to connect to the database")
}