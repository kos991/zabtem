use std::net::SocketAddr;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "zabtem_server=info,tower_http=info".into()),
        )
        .init();

    let addr = SocketAddr::from(([127, 0, 0, 1], 18080));
    let listener = tokio::net::TcpListener::bind(addr).await?;

    tracing::info!(%addr, "zabtem server listening");
    axum::serve(listener, zabtem_server::app()).await?;

    Ok(())
}
