use axum::{http::StatusCode, Json};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct SnmpProfileRequest {
    pub target: String,
    pub version: String,
    pub community: Option<String>,
    #[serde(rename = "securityName")]
    pub security_name: Option<String>,
    #[serde(rename = "authProtocol")]
    pub auth_protocol: Option<String>,
    #[serde(rename = "authPassword")]
    pub auth_password: Option<String>,
    #[serde(rename = "privProtocol")]
    pub priv_protocol: Option<String>,
    #[serde(rename = "privPassword")]
    pub priv_password: Option<String>,
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
    if !is_valid_profile(&request) {
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
    if !is_valid_profile(&request) {
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

fn is_valid_profile(request: &SnmpProfileRequest) -> bool {
    if request.target.trim().is_empty() || request.version.trim().is_empty() {
        return false;
    }

    if request.version == "v3" {
        let has_auth_protocol = request
            .auth_protocol
            .as_deref()
            .is_some_and(|protocol| !protocol.trim().is_empty());
        let has_auth_password = request
            .auth_password
            .as_deref()
            .is_some_and(|password| !password.trim().is_empty());
        let has_priv_protocol = request
            .priv_protocol
            .as_deref()
            .is_some_and(|protocol| !protocol.trim().is_empty());
        let has_priv_password = request
            .priv_password
            .as_deref()
            .is_some_and(|password| !password.trim().is_empty());

        return request
            .security_name
            .as_deref()
            .is_some_and(|security_name| !security_name.trim().is_empty())
            && has_auth_protocol
            && has_auth_password
            && has_priv_protocol
            && has_priv_password;
    }

    request
        .community
        .as_deref()
        .is_some_and(|community| !community.trim().is_empty())
}
