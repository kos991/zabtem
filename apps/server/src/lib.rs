mod snmp;
mod template;

use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
}

pub fn app() -> Router {
    Router::new()
        .route("/api/health", get(health))
        .route("/api/snmp/test", post(snmp::test_profile))
        .route("/api/snmp/walk", post(snmp::walk_profile))
        .route("/api/template/classify", post(template::classify))
        .route("/api/template/preview", post(template::preview))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "zabtem-server",
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    #[tokio::test]
    async fn health_endpoint_returns_ok() {
        let response = app()
            .oneshot(
                axum::http::Request::builder()
                    .uri("/api/health")
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("request should succeed");

        assert_eq!(response.status(), axum::http::StatusCode::OK);

        let body = response
            .into_body()
            .collect()
            .await
            .expect("body should collect")
            .to_bytes();
        let payload: serde_json::Value = serde_json::from_slice(&body).expect("valid json");

        assert_eq!(payload["status"], "ok");
        assert_eq!(payload["service"], "zabtem-server");
    }

    #[tokio::test]
    async fn snmp_test_endpoint_returns_reachable_result() {
        let response = app()
            .oneshot(
                axum::http::Request::builder()
                    .method(axum::http::Method::POST)
                    .uri("/api/snmp/test")
                    .header(axum::http::header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        r#"{"target":"192.168.1.10","version":"v2c","community":"public"}"#,
                    ))
                    .expect("request should build"),
            )
            .await
            .expect("request should succeed");

        assert_eq!(response.status(), axum::http::StatusCode::OK);

        let body = response
            .into_body()
            .collect()
            .await
            .expect("body should collect")
            .to_bytes();
        let payload: serde_json::Value = serde_json::from_slice(&body).expect("valid json");

        assert_eq!(payload["reachable"], true);
        assert_eq!(payload["target"], "192.168.1.10");
        assert_eq!(payload["version"], "v2c");
        assert_eq!(payload["message"], "SNMP profile accepted by simulated collector");
        assert!(payload["latencyMs"].as_u64().expect("latency should be numeric") > 0);
    }

    #[tokio::test]
    async fn snmp_test_rejects_empty_target() {
        let response = app()
            .oneshot(
                axum::http::Request::builder()
                    .method(axum::http::Method::POST)
                    .uri("/api/snmp/test")
                    .header(axum::http::header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        r#"{"target":"","version":"v2c","community":"public"}"#,
                    ))
                    .expect("request should build"),
            )
            .await
            .expect("request should succeed");

        assert_eq!(response.status(), axum::http::StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn snmp_walk_endpoint_returns_oid_samples() {
        let response = app()
            .oneshot(
                axum::http::Request::builder()
                    .method(axum::http::Method::POST)
                    .uri("/api/snmp/walk")
                    .header(axum::http::header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        r#"{"target":"192.168.1.10","version":"v2c","community":"public"}"#,
                    ))
                    .expect("request should build"),
            )
            .await
            .expect("request should succeed");

        assert_eq!(response.status(), axum::http::StatusCode::OK);

        let body = response
            .into_body()
            .collect()
            .await
            .expect("body should collect")
            .to_bytes();
        let payload: serde_json::Value = serde_json::from_slice(&body).expect("valid json");

        assert_eq!(payload["target"], "192.168.1.10");
        assert!(payload["items"].as_array().expect("items array").len() >= 4);
        assert_eq!(payload["items"][0]["oid"], "1.3.6.1.2.1.1.1.0");
    }

    #[tokio::test]
    async fn oid_classify_endpoint_groups_walk_items() {
        let response = app()
            .oneshot(
                axum::http::Request::builder()
                    .method(axum::http::Method::POST)
                    .uri("/api/template/classify")
                    .header(axum::http::header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        r#"{"items":[{"oid":"1.3.6.1.2.1.2.2.1.10.1","name":"ifInOctets","value":"42","valueType":"counter"}]}"#,
                    ))
                    .expect("request should build"),
            )
            .await
            .expect("request should succeed");

        assert_eq!(response.status(), axum::http::StatusCode::OK);

        let body = response
            .into_body()
            .collect()
            .await
            .expect("body should collect")
            .to_bytes();
        let payload: serde_json::Value = serde_json::from_slice(&body).expect("valid json");

        assert_eq!(payload["items"][0]["group"], "interfaces");
        assert_eq!(payload["items"][0]["zabbixType"], "SNMP_AGENT");
    }

    #[tokio::test]
    async fn template_preview_endpoint_returns_zabbix_yaml() {
        let response = app()
            .oneshot(
                axum::http::Request::builder()
                    .method(axum::http::Method::POST)
                    .uri("/api/template/preview")
                    .header(axum::http::header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        r#"{"templateName":"Template Zabtem Simulated SNMP","items":[{"oid":"1.3.6.1.2.1.1.3.0","name":"sysUpTime","group":"system","zabbixType":"SNMP_AGENT","valueType":"timeticks"}]}"#,
                    ))
                    .expect("request should build"),
            )
            .await
            .expect("request should succeed");

        assert_eq!(response.status(), axum::http::StatusCode::OK);

        let body = response
            .into_body()
            .collect()
            .await
            .expect("body should collect")
            .to_bytes();
        let payload: serde_json::Value = serde_json::from_slice(&body).expect("valid json");
        let yaml = payload["yaml"].as_str().expect("yaml string");

        assert!(yaml.contains("zabbix_export:"));
        assert!(yaml.contains("Template Zabtem Simulated SNMP"));
        assert!(yaml.contains("sysUpTime"));
    }
}
