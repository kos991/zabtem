use axum::{http::StatusCode, Json};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct WalkItemInput {
    pub oid: String,
    pub name: String,
    pub value: String,
    #[serde(rename = "valueType")]
    pub value_type: String,
}

#[derive(Debug, Deserialize)]
pub struct ClassifyRequest {
    pub items: Vec<WalkItemInput>,
}

#[derive(Debug, Serialize)]
pub struct ClassifiedItem {
    pub oid: String,
    pub name: String,
    pub group: &'static str,
    #[serde(rename = "zabbixType")]
    pub zabbix_type: &'static str,
    #[serde(rename = "valueType")]
    pub value_type: String,
}

#[derive(Debug, Serialize)]
pub struct ClassifyResponse {
    pub items: Vec<ClassifiedItem>,
}

pub async fn classify(
    Json(request): Json<ClassifyRequest>,
) -> Result<Json<ClassifyResponse>, StatusCode> {
    if request.items.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    Ok(Json(ClassifyResponse {
        items: request
            .items
            .into_iter()
            .map(|item| {
                let group = classify_group(&item.oid);
                let _sample_value = item.value;

                ClassifiedItem {
                    group,
                    zabbix_type: "SNMP_AGENT",
                    oid: item.oid,
                    name: item.name,
                    value_type: item.value_type,
                }
            })
            .collect(),
    }))
}

fn classify_group(oid: &str) -> &'static str {
    if oid.starts_with("1.3.6.1.2.1.2.") {
        "interfaces"
    } else if oid.starts_with("1.3.6.1.2.1.25.") {
        "storage"
    } else {
        "system"
    }
}
