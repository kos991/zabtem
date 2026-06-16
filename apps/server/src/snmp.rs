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

#[derive(Debug, Serialize)]
pub struct SnmpWalkItem {
    pub oid: &'static str,
    pub name: &'static str,
    pub value: &'static str,
    #[serde(rename = "valueType")]
    pub value_type: &'static str,
}

#[derive(Debug, Serialize)]
pub struct SnmpWalkResponse {
    pub target: String,
    pub version: String,
    pub items: Vec<SnmpWalkItem>,
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

pub async fn walk_profile(
    Json(request): Json<SnmpProfileRequest>,
) -> Result<Json<SnmpWalkResponse>, StatusCode> {
    if request.target.trim().is_empty()
        || request.version.trim().is_empty()
        || request.community.trim().is_empty()
    {
        return Err(StatusCode::BAD_REQUEST);
    }

    Ok(Json(SnmpWalkResponse {
        target: request.target,
        version: request.version,
        items: vec![
            SnmpWalkItem {
                oid: "1.3.6.1.2.1.1.1.0",
                name: "sysDescr",
                value: "Linux zabtem-sim 6.8 x86_64",
                value_type: "text",
            },
            SnmpWalkItem {
                oid: "1.3.6.1.2.1.1.3.0",
                name: "sysUpTime",
                value: "8640000",
                value_type: "timeticks",
            },
            SnmpWalkItem {
                oid: "1.3.6.1.2.1.2.2.1.10.1",
                name: "ifInOctets",
                value: "4815162342",
                value_type: "counter",
            },
            SnmpWalkItem {
                oid: "1.3.6.1.2.1.25.2.3.1.6.1",
                name: "hrStorageUsed",
                value: "7340032",
                value_type: "gauge",
            },
        ],
    }))
}
