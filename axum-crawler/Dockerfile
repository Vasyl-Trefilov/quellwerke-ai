FROM rust:latest

WORKDIR /app

# Copy Cargo files first for caching
COPY Cargo.toml Cargo.lock ./

# Dummy build to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Copy the real source
COPY . .

# Install netcat for entrypoint script
RUN apt-get update && apt-get install -y postgresql-client netcat-traditional && rm -rf /var/lib/apt/lists/*

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Build release binary
RUN cargo clean && cargo build --release

# Expose port
EXPOSE 4000

# Use the entrypoint script
CMD ["/app/docker-entrypoint.sh"]
