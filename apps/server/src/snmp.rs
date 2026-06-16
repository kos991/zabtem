use axum::{http::StatusCode, Json};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct SnmpProfileRequest {
    pub target: String,
    pub version: String,
    pub community: String,
}

#[derive(Debug, Serialize)]
pub struct SnmpTestResponse {
    pub reachable: bool,
    pub target: String,
    pub version: String,
    #[serde(rename = "latencyMs")]
    pub latency_ms: u64,
    pub message: &'static str,
}

pub async fn test_profile(
    Json(request): Json<SnmpProfileRequest>,
) -> Result<Json<SnmpTestResponse>, StatusCode> {
    if request.target.trim().is_empty()
        || request.version.trim().is_empty()
        || request.community.trim().is_empty()
    {
        return Err(StatusCode::BAD_REQUEST);
    }

    Ok(Json(SnmpTestResponse {
        reachable: true,
        target: request.target,
        version: request.version,
        latency_ms: 18,
        message: "SNMP profile accepted by simulated collector",
    }))
}
