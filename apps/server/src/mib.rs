use axum::{http::StatusCode, Json};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct MibScanRequest {
    #[serde(rename = "fileName")]
    pub file_name: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct MibScanResponse {
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "moduleName")]
    pub module_name: String,
    pub entries: Vec<MibEntry>,
}

#[derive(Debug, Serialize)]
pub struct MibEntry {
    pub name: String,
    pub oid: String,
    pub syntax: String,
    pub access: String,
    pub description: String,
}

pub async fn scan(
    Json(request): Json<MibScanRequest>,
) -> Result<Json<MibScanResponse>, StatusCode> {
    if request.file_name.trim().is_empty() || request.content.trim().is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let module_name = parse_module_name(&request.content).ok_or(StatusCode::BAD_REQUEST)?;
    let entries = parse_object_type_entries(&request.content);

    if entries.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    Ok(Json(MibScanResponse {
        file_name: request.file_name,
        module_name,
        entries,
    }))
}

fn parse_module_name(content: &str) -> Option<String> {
    content.lines().find_map(|line| {
        let normalized = line.trim();
        normalized
            .contains("DEFINITIONS")
            .then(|| normalized.split_whitespace().next().unwrap_or_default().to_string())
            .filter(|name| !name.is_empty())
    })
}

fn parse_object_type_entries(content: &str) -> Vec<MibEntry> {
    let lines: Vec<&str> = content.lines().collect();
    let mut entries = Vec::new();
    let mut index = 0;

    while index < lines.len() {
        let line = lines[index].trim();
        if !line.ends_with("OBJECT-TYPE") {
            index += 1;
            continue;
        }

        let name = line.trim_end_matches("OBJECT-TYPE").trim().to_string();
        index += 1;

        let mut block = Vec::new();
        while index < lines.len() {
            let current = lines[index].trim();
            block.push(current.to_string());
            index += 1;

            if current.starts_with("::=") {
                break;
            }
        }

        if let Some(entry) = parse_object_type_block(name, &block) {
            entries.push(entry);
        }
    }

    entries
}

fn parse_object_type_block(name: String, block: &[String]) -> Option<MibEntry> {
    let syntax = parse_prefixed_value(block, "SYNTAX").unwrap_or_else(|| "OCTET STRING".to_string());
    let access = parse_prefixed_value(block, "MAX-ACCESS")
        .or_else(|| parse_prefixed_value(block, "ACCESS"))
        .unwrap_or_else(|| "read-only".to_string());
    let description = parse_description(block);
    let oid = block
        .iter()
        .find_map(|line| line.strip_prefix("::="))
        .and_then(parse_oid_assignment)?;

    Some(MibEntry {
        name,
        oid,
        syntax,
        access,
        description,
    })
}

fn parse_prefixed_value(block: &[String], prefix: &str) -> Option<String> {
    block.iter().find_map(|line| {
        line.strip_prefix(prefix)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned)
    })
}

fn parse_description(block: &[String]) -> String {
    let Some(start_index) = block
        .iter()
        .position(|line| line.starts_with("DESCRIPTION"))
    else {
        return String::new();
    };

    let mut text = block[start_index]
        .trim_start_matches("DESCRIPTION")
        .trim()
        .to_string();

    let mut index = start_index + 1;
    while !text.matches('"').count().is_multiple_of(2) && index < block.len() {
        text.push(' ');
        text.push_str(block[index].trim());
        index += 1;
    }

    text.trim_matches('"').to_string()
}

fn parse_oid_assignment(value: &str) -> Option<String> {
    let trimmed = value.trim();
    let inner = trimmed.strip_prefix('{')?.strip_suffix('}')?.trim();
    let parts: Vec<String> = inner
        .split_whitespace()
        .map(|part| part.trim_matches(|ch| ch == '{' || ch == '}' || ch == ','))
        .filter(|part| !part.is_empty())
        .map(ToOwned::to_owned)
        .collect();

    (!parts.is_empty()).then(|| parts.join("."))
}

trait MultipleOfExt {
    fn is_multiple_of(self, rhs: usize) -> bool;
}

impl MultipleOfExt for usize {
    fn is_multiple_of(self, rhs: usize) -> bool {
        rhs != 0 && self % rhs == 0
    }
}
