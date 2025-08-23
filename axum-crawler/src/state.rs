use sqlx::PgPool;

// This state will used in all files 
pub struct AppState {
    pub db: PgPool
}
