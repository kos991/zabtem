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

#[derive(Debug, Deserialize)]
pub struct TemplatePreviewRequest {
    #[serde(rename = "templateName")]
    pub template_name: String,
    pub items: Vec<ClassifiedItemInput>,
}

#[derive(Debug, Deserialize)]
pub struct ClassifiedItemInput {
    pub oid: String,
    pub name: String,
    pub group: String,
    #[serde(rename = "zabbixType")]
    pub zabbix_type: String,
    #[serde(rename = "valueType")]
    pub value_type: String,
}

#[derive(Debug, Serialize)]
pub struct TemplatePreviewResponse {
    pub yaml: String,
}

#[derive(Debug, Serialize)]
struct ZabbixExport<'a> {
    zabbix_export: ZabbixExportBody<'a>,
}

#[derive(Debug, Serialize)]
struct ZabbixExportBody<'a> {
    version: &'static str,
    templates: Vec<ZabbixTemplate<'a>>,
}

#[derive(Debug, Serialize)]
struct ZabbixTemplate<'a> {
    template: &'a str,
    name: &'a str,
    groups: Vec<ZabbixGroup>,
    items: Vec<ZabbixItem<'a>>,
}

#[derive(Debug, Serialize)]
struct ZabbixGroup {
    name: String,
}

#[derive(Debug, Serialize)]
struct ZabbixItem<'a> {
    name: &'a str,
    key: String,
    r#type: &'a str,
    snmp_oid: &'a str,
    value_type: &'a str,
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

pub async fn preview(
    Json(request): Json<TemplatePreviewRequest>,
) -> Result<Json<TemplatePreviewResponse>, StatusCode> {
    if request.template_name.trim().is_empty() || request.items.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let export = ZabbixExport {
        zabbix_export: ZabbixExportBody {
            version: "7.0",
            templates: vec![ZabbixTemplate {
                template: &request.template_name,
                name: &request.template_name,
                groups: vec![ZabbixGroup {
                    name: "Templates/Network devices".to_string(),
                }],
                items: request
                    .items
                    .iter()
                    .map(|item| {
                        let _group = &item.group;

                        ZabbixItem {
                            name: &item.name,
                            key: format!("snmp.{}", item.name),
                            r#type: &item.zabbix_type,
                            snmp_oid: &item.oid,
                            value_type: &item.value_type,
                        }
                    })
                    .collect(),
            }],
        },
    };

    let yaml = serde_yaml::to_string(&export).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(TemplatePreviewResponse { yaml }))
}
