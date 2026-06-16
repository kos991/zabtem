# SNMP Template Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current simulated SNMP test into a working template-generation pipeline: validate a profile, collect deterministic walk data, classify OIDs, preview a Zabbix 7.0 YAML template, and expose the flow in the workbench.

**Architecture:** Keep the backend deterministic first so tests and UI can move quickly without depending on a lab device. Split server logic into small modules under `apps/server/src/` and keep Axum routes thin. The frontend remains a single TDesign workbench for now, but API calls and typed payloads move into small renderer helpers before the UI grows.

**Tech Stack:** Rust Axum backend, serde/serde_json, React + Vite + TDesign frontend, Vitest + Testing Library, GitHub Actions CI.

---

## File Structure

- Create `apps/server/src/snmp.rs`: profile request types, simulated connection test, deterministic walk sample provider.
- Create `apps/server/src/template.rs`: OID classification model and Zabbix YAML rendering model.
- Modify `apps/server/src/lib.rs`: wire routes and keep route handlers thin.
- Modify `apps/server/Cargo.toml`: add `serde_yaml` when YAML rendering is introduced.
- Create `apps/desktop/src/renderer/api.ts`: typed fetch helpers for health, SNMP test, walk, classify, and template preview.
- Modify `apps/desktop/src/renderer/App.tsx`: use API helper, add task states for walk/classification/export.
- Modify `apps/desktop/src/renderer/App.test.tsx`: cover the visible pipeline flow.
- Modify `apps/desktop/src/renderer/styles.css`: add compact panels for walk/classification/template preview.

---

## Task 1: Extract Typed SNMP Backend Module

**Files:**
- Create: `apps/server/src/snmp.rs`
- Modify: `apps/server/src/lib.rs`

- [ ] **Step 1: Write the failing backend tests**

Add to `apps/server/src/lib.rs` test module:

```rust
#[tokio::test]
async fn snmp_test_rejects_empty_target() {
    let response = app()
        .oneshot(
            axum::http::Request::builder()
                .method(axum::http::Method::POST)
                .uri("/api/snmp/test")
                .header(axum::http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(r#"{"target":"","version":"v2c","community":"public"}"#))
                .expect("request should build"),
        )
        .await
        .expect("request should succeed");

    assert_eq!(response.status(), axum::http::StatusCode::BAD_REQUEST);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cargo test -p zabtem-server snmp_test_rejects_empty_target
```

Expected: FAIL because `/api/snmp/test` currently accepts an empty target.

- [ ] **Step 3: Create `apps/server/src/snmp.rs`**

```rust
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
```

- [ ] **Step 4: Wire the module in `apps/server/src/lib.rs`**

Replace inline SNMP structs and handler with:

```rust
mod snmp;

use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
```

Update router:

```rust
.route("/api/snmp/test", post(snmp::test_profile))
```

- [ ] **Step 5: Run backend tests**

Run:

```bash
cargo test -p zabtem-server
cargo check -p zabtem-server
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/lib.rs apps/server/src/snmp.rs
git commit -m "refactor: extract snmp backend module"
```

---

## Task 2: Add Deterministic SNMP Walk Endpoint

**Files:**
- Modify: `apps/server/src/snmp.rs`
- Modify: `apps/server/src/lib.rs`

- [ ] **Step 1: Write the failing backend test**

Add to `apps/server/src/lib.rs` tests:

```rust
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

    let body = response.into_body().collect().await.expect("body").to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).expect("valid json");

    assert_eq!(payload["target"], "192.168.1.10");
    assert!(payload["items"].as_array().expect("items array").len() >= 4);
    assert_eq!(payload["items"][0]["oid"], "1.3.6.1.2.1.1.1.0");
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cargo test -p zabtem-server snmp_walk_endpoint_returns_oid_samples
```

Expected: FAIL with 404 because `/api/snmp/walk` does not exist.

- [ ] **Step 3: Add walk types and handler to `apps/server/src/snmp.rs`**

```rust
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
```

- [ ] **Step 4: Wire route in `apps/server/src/lib.rs`**

```rust
.route("/api/snmp/walk", post(snmp::walk_profile))
```

- [ ] **Step 5: Run backend tests**

```bash
cargo test -p zabtem-server
cargo check -p zabtem-server
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/lib.rs apps/server/src/snmp.rs
git commit -m "feat: add simulated snmp walk endpoint"
```

---

## Task 3: Add OID Classification Endpoint

**Files:**
- Create: `apps/server/src/template.rs`
- Modify: `apps/server/src/lib.rs`

- [ ] **Step 1: Write the failing backend test**

Add to `apps/server/src/lib.rs` tests:

```rust
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

    let body = response.into_body().collect().await.expect("body").to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).expect("valid json");

    assert_eq!(payload["items"][0]["group"], "interfaces");
    assert_eq!(payload["items"][0]["zabbixType"], "SNMP_AGENT");
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cargo test -p zabtem-server oid_classify_endpoint_groups_walk_items
```

Expected: FAIL with 404.

- [ ] **Step 3: Create `apps/server/src/template.rs`**

```rust
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
            .map(|item| ClassifiedItem {
                group: classify_group(&item.oid),
                zabbix_type: "SNMP_AGENT",
                oid: item.oid,
                name: item.name,
                value_type: item.value_type,
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
```

- [ ] **Step 4: Wire route in `apps/server/src/lib.rs`**

Add:

```rust
mod template;
```

Update router:

```rust
.route("/api/template/classify", post(template::classify))
```

- [ ] **Step 5: Run backend tests**

```bash
cargo test -p zabtem-server
cargo check -p zabtem-server
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/lib.rs apps/server/src/template.rs
git commit -m "feat: classify snmp oid samples"
```

---

## Task 4: Add Zabbix YAML Preview Endpoint

**Files:**
- Modify: `apps/server/Cargo.toml`
- Modify: `apps/server/src/template.rs`
- Modify: `apps/server/src/lib.rs`

- [ ] **Step 1: Add dependency**

In `apps/server/Cargo.toml`, add:

```toml
serde_yaml = "0.9"
```

- [ ] **Step 2: Write the failing backend test**

Add to `apps/server/src/lib.rs` tests:

```rust
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

    let body = response.into_body().collect().await.expect("body").to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).expect("valid json");
    let yaml = payload["yaml"].as_str().expect("yaml string");

    assert!(yaml.contains("zabbix_export:"));
    assert!(yaml.contains("Template Zabtem Simulated SNMP"));
    assert!(yaml.contains("sysUpTime"));
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cargo test -p zabtem-server template_preview_endpoint_returns_zabbix_yaml
```

Expected: FAIL with 404.

- [ ] **Step 4: Add preview types and handler to `apps/server/src/template.rs`**

```rust
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
                    .map(|item| ZabbixItem {
                        name: &item.name,
                        key: format!("snmp.{}", item.name),
                        r#type: &item.zabbix_type,
                        snmp_oid: &item.oid,
                        value_type: &item.value_type,
                    })
                    .collect(),
            }],
        },
    };

    let yaml = serde_yaml::to_string(&export).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(TemplatePreviewResponse { yaml }))
}
```

- [ ] **Step 5: Wire route in `apps/server/src/lib.rs`**

```rust
.route("/api/template/preview", post(template::preview))
```

- [ ] **Step 6: Run backend tests**

```bash
cargo test -p zabtem-server
cargo check -p zabtem-server
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/server/Cargo.toml Cargo.lock apps/server/src/lib.rs apps/server/src/template.rs
git commit -m "feat: preview zabbix yaml template"
```

---

## Task 5: Extract Frontend API Client

**Files:**
- Create: `apps/desktop/src/renderer/api.ts`
- Modify: `apps/desktop/src/renderer/App.tsx`
- Modify: `apps/desktop/src/renderer/App.test.tsx`

- [ ] **Step 1: Create API helper**

Create `apps/desktop/src/renderer/api.ts`:

```ts
export type HealthPayload = {
  status?: string;
  service?: string;
};

export type SnmpProfileRequest = {
  target: string;
  version: string;
  community: string;
};

export type SnmpTestPayload = {
  reachable: boolean;
  target: string;
  version: string;
  latencyMs: number;
  message: string;
};

export type SnmpWalkItem = {
  oid: string;
  name: string;
  value: string;
  valueType: string;
};

export type SnmpWalkPayload = {
  target: string;
  version: string;
  items: SnmpWalkItem[];
};

export type ClassifiedItem = {
  oid: string;
  name: string;
  group: string;
  zabbixType: string;
  valueType: string;
};

export async function getHealth(): Promise<HealthPayload> {
  return getJson('/api/health');
}

export async function testSnmpProfile(profile: SnmpProfileRequest): Promise<SnmpTestPayload> {
  return postJson('/api/snmp/test', profile);
}

export async function walkSnmpProfile(profile: SnmpProfileRequest): Promise<SnmpWalkPayload> {
  return postJson('/api/snmp/walk', profile);
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
```

- [ ] **Step 2: Update `App.tsx` imports and calls**

Import:

```ts
import {
  getHealth,
  testSnmpProfile,
  type HealthPayload,
  type SnmpTestPayload
} from './api';
```

Remove local `HealthPayload` and `SnmpTestPayload` type declarations.

Replace:

```ts
const response = await fetch('/api/health');
...
const payload = (await response.json()) as HealthPayload;
```

with:

```ts
const payload = await getHealth();
```

Replace the SNMP POST block with:

```ts
const payload = await testSnmpProfile({
  target: '192.168.1.10',
  version: 'v2c',
  community: 'public'
});
```

- [ ] **Step 3: Run frontend tests**

```bash
corepack pnpm test -- apps/desktop/src/renderer/App.test.tsx
corepack pnpm typecheck
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/api.ts apps/desktop/src/renderer/App.tsx apps/desktop/src/renderer/App.test.tsx
git commit -m "refactor: extract renderer api client"
```

---

## Task 6: Add Frontend Walk and Classification Flow

**Files:**
- Modify: `apps/desktop/src/renderer/api.ts`
- Modify: `apps/desktop/src/renderer/App.tsx`
- Modify: `apps/desktop/src/renderer/App.test.tsx`
- Modify: `apps/desktop/src/renderer/styles.css`

- [ ] **Step 1: Extend API helper**

Add to `api.ts`:

```ts
export type ClassifyPayload = {
  items: ClassifiedItem[];
};

export async function classifyWalkItems(items: SnmpWalkItem[]): Promise<ClassifyPayload> {
  return postJson('/api/template/classify', { items });
}
```

- [ ] **Step 2: Write failing frontend test**

Add to `App.test.tsx`:

```ts
test('runs walk and classification after the connection test', async () => {
  render(<App />);

  await userEvent.click(screen.getByTestId('run-snmp-test'));
  await userEvent.click(await screen.findByTestId('run-snmp-walk'));

  await waitFor(() => {
    expect(screen.getByTestId('snmp-walk-result').textContent).toContain('4 OIDs');
  });

  await userEvent.click(screen.getByTestId('run-oid-classify'));

  await waitFor(() => {
    expect(screen.getByTestId('oid-classify-result').textContent).toContain('interfaces');
    expect(screen.getByTestId('oid-classify-result').textContent).toContain('storage');
  });
});
```

Extend the fetch mock:

```ts
if (String(input) === '/api/snmp/walk') {
  return {
    ok: true,
    json: async () => ({
      target: '192.168.1.10',
      version: 'v2c',
      items: [
        { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', value: 'Linux', valueType: 'text' },
        { oid: '1.3.6.1.2.1.1.3.0', name: 'sysUpTime', value: '8640000', valueType: 'timeticks' },
        { oid: '1.3.6.1.2.1.2.2.1.10.1', name: 'ifInOctets', value: '42', valueType: 'counter' },
        { oid: '1.3.6.1.2.1.25.2.3.1.6.1', name: 'hrStorageUsed', value: '100', valueType: 'gauge' }
      ]
    })
  };
}

if (String(input) === '/api/template/classify') {
  return {
    ok: true,
    json: async () => ({
      items: [
        { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', group: 'system', zabbixType: 'SNMP_AGENT', valueType: 'text' },
        { oid: '1.3.6.1.2.1.2.2.1.10.1', name: 'ifInOctets', group: 'interfaces', zabbixType: 'SNMP_AGENT', valueType: 'counter' },
        { oid: '1.3.6.1.2.1.25.2.3.1.6.1', name: 'hrStorageUsed', group: 'storage', zabbixType: 'SNMP_AGENT', valueType: 'gauge' }
      ]
    })
  };
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
corepack pnpm test -- apps/desktop/src/renderer/App.test.tsx
```

Expected: FAIL because `run-snmp-walk` does not exist.

- [ ] **Step 4: Add walk/classification state in `App.tsx`**

Add states:

```ts
const [walk, setWalk] = useState<
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'success'; payload: SnmpWalkPayload }
  | { status: 'error'; message: string }
>({ status: 'idle' });

const [classification, setClassification] = useState<
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'success'; payload: ClassifyPayload }
  | { status: 'error'; message: string }
>({ status: 'idle' });
```

Add handlers:

```ts
async function runSnmpWalk() {
  setWalk({ status: 'running' });
  try {
    const payload = await walkSnmpProfile({
      target: '192.168.1.10',
      version: 'v2c',
      community: 'public'
    });
    setWalk({ status: 'success', payload });
  } catch (error) {
    setWalk({ status: 'error', message: error instanceof Error ? error.message : 'SNMP walk 失败' });
  }
}

async function runOidClassify() {
  if (walk.status !== 'success') return;
  setClassification({ status: 'running' });
  try {
    const payload = await classifyWalkItems(walk.payload.items);
    setClassification({ status: 'success', payload });
  } catch (error) {
    setClassification({ status: 'error', message: error instanceof Error ? error.message : 'OID 归类失败' });
  }
}
```

- [ ] **Step 5: Add compact UI controls**

Below the connection result, add:

```tsx
<div className="pipeline-actions">
  <Button
    data-testid="run-snmp-walk"
    variant="outline"
    disabled={snmpTest.status !== 'success' || walk.status === 'running'}
    loading={walk.status === 'running'}
    onClick={() => void runSnmpWalk()}
  >
    采集 walk
  </Button>
  <Button
    data-testid="run-oid-classify"
    variant="outline"
    disabled={walk.status !== 'success' || classification.status === 'running'}
    loading={classification.status === 'running'}
    onClick={() => void runOidClassify()}
  >
    OID 归类
  </Button>
</div>

{walk.status === 'success' ? (
  <div className="pipeline-result" data-testid="snmp-walk-result">
    <strong>{walk.payload.items.length} OIDs</strong>
    <span>{walk.payload.target} / {walk.payload.version}</span>
  </div>
) : null}

{classification.status === 'success' ? (
  <div className="pipeline-result" data-testid="oid-classify-result">
    {classification.payload.items.map((item) => (
      <Tag key={item.oid} theme="default" variant="light">
        {item.group}: {item.name}
      </Tag>
    ))}
  </div>
) : null}
```

- [ ] **Step 6: Add CSS**

```css
.pipeline-actions,
.pipeline-result {
  display: flex;
  grid-column: 2;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.pipeline-result {
  padding: 10px 12px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #ffffff;
}
```

In the mobile media query:

```css
.pipeline-actions,
.pipeline-result {
  grid-column: 1;
}
```

- [ ] **Step 7: Run frontend verification**

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add apps/desktop/src/renderer/api.ts apps/desktop/src/renderer/App.tsx apps/desktop/src/renderer/App.test.tsx apps/desktop/src/renderer/styles.css
git commit -m "feat: add walk and oid classification flow"
```

---

## Task 7: Add YAML Preview to Frontend

**Files:**
- Modify: `apps/desktop/src/renderer/api.ts`
- Modify: `apps/desktop/src/renderer/App.tsx`
- Modify: `apps/desktop/src/renderer/App.test.tsx`
- Modify: `apps/desktop/src/renderer/styles.css`

- [ ] **Step 1: Extend API helper**

Add to `api.ts`:

```ts
export type TemplatePreviewPayload = {
  yaml: string;
};

export async function previewTemplate(items: ClassifiedItem[]): Promise<TemplatePreviewPayload> {
  return postJson('/api/template/preview', {
    templateName: 'Template Zabtem Simulated SNMP',
    items
  });
}
```

- [ ] **Step 2: Write failing frontend test**

Add to `App.test.tsx`:

```ts
test('previews zabbix yaml after classification', async () => {
  render(<App />);

  await userEvent.click(screen.getByTestId('run-snmp-test'));
  await userEvent.click(await screen.findByTestId('run-snmp-walk'));
  await userEvent.click(await screen.findByTestId('run-oid-classify'));
  await userEvent.click(await screen.findByTestId('run-template-preview'));

  await waitFor(() => {
    expect(screen.getByTestId('template-preview').textContent).toContain('zabbix_export');
    expect(screen.getByTestId('template-preview').textContent).toContain('Template Zabtem Simulated SNMP');
  });
});
```

Extend fetch mock:

```ts
if (String(input) === '/api/template/preview') {
  return {
    ok: true,
    json: async () => ({
      yaml: 'zabbix_export:\\n  version: \"7.0\"\\n  templates:\\n    - template: Template Zabtem Simulated SNMP\\n'
    })
  };
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
corepack pnpm test -- apps/desktop/src/renderer/App.test.tsx
```

Expected: FAIL because `run-template-preview` does not exist.

- [ ] **Step 4: Add template state and handler**

```ts
const [templatePreview, setTemplatePreview] = useState<
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'success'; payload: TemplatePreviewPayload }
  | { status: 'error'; message: string }
>({ status: 'idle' });

async function runTemplatePreview() {
  if (classification.status !== 'success') return;
  setTemplatePreview({ status: 'running' });
  try {
    const payload = await previewTemplate(classification.payload.items);
    setTemplatePreview({ status: 'success', payload });
  } catch (error) {
    setTemplatePreview({
      status: 'error',
      message: error instanceof Error ? error.message : '模板预览失败'
    });
  }
}
```

- [ ] **Step 5: Add UI**

```tsx
<Button
  data-testid="run-template-preview"
  theme="primary"
  disabled={classification.status !== 'success' || templatePreview.status === 'running'}
  loading={templatePreview.status === 'running'}
  onClick={() => void runTemplatePreview()}
>
  预览 YAML
</Button>

{templatePreview.status === 'success' ? (
  <pre className="template-preview" data-testid="template-preview">
    {templatePreview.payload.yaml}
  </pre>
) : null}
```

- [ ] **Step 6: Add CSS**

```css
.template-preview {
  grid-column: 2;
  max-height: 280px;
  overflow: auto;
  margin: 0;
  padding: 12px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #101827;
  color: #e7eef8;
  font-size: 12px;
  line-height: 1.55;
}
```

Mobile:

```css
.template-preview {
  grid-column: 1;
}
```

- [ ] **Step 7: Run frontend verification**

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add apps/desktop/src/renderer/api.ts apps/desktop/src/renderer/App.tsx apps/desktop/src/renderer/App.test.tsx apps/desktop/src/renderer/styles.css
git commit -m "feat: preview generated zabbix yaml"
```

---

## Task 8: Full Verification, Push, Actions, Deploy

**Files:**
- No source edits expected.

- [ ] **Step 1: Run local verification**

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
cargo test -p zabtem-server
cargo check -p zabtem-server
```

If local Windows has no `cargo`, run Rust commands on `root@192.168.0.142` after pushing.

- [ ] **Step 2: Push main**

```bash
git status --short --branch
git push origin main
```

- [ ] **Step 3: Confirm GitHub Actions**

Use the Actions page or API and wait for the latest `main` run:

```powershell
$runs = Invoke-RestMethod -Uri 'https://api.github.com/repos/kos991/zabtem/actions/runs?branch=main&per_page=1' -Headers @{ 'User-Agent'='codeg' }
$runs.workflow_runs[0] | Select-Object id,status,conclusion,html_url,head_sha
```

Expected: `status=completed`, `conclusion=success`.

- [ ] **Step 4: Deploy to server**

Run on `root@192.168.0.142`:

```bash
cd /root/zabtem
git fetch origin main
git checkout main
git reset --hard origin/main
corepack pnpm install --frozen-lockfile
corepack pnpm build
. "$HOME/.cargo/env"
cargo test -p zabtem-server
mkdir -p /root/zabtem/.run
if [ -f /root/zabtem/.run/server.pid ]; then kill "$(cat /root/zabtem/.run/server.pid)" 2>/dev/null || true; fi
if [ -f /root/zabtem/.run/web.pid ]; then kill "$(cat /root/zabtem/.run/web.pid)" 2>/dev/null || true; fi
for pid in $(lsof -ti tcp:5173 2>/dev/null || true); do kill "$pid" 2>/dev/null || true; done
for pid in $(lsof -ti tcp:18080 2>/dev/null || true); do kill "$pid" 2>/dev/null || true; done
nohup bash -lc 'cd /root/zabtem && . "$HOME/.cargo/env" && cargo run -p zabtem-server' > /root/zabtem/.run/server.log 2>&1 & echo $! > /root/zabtem/.run/server.pid
sleep 3
nohup bash -lc 'cd /root/zabtem/apps/desktop && corepack pnpm exec vite --host 0.0.0.0' > /root/zabtem/.run/web.log 2>&1 & echo $! > /root/zabtem/.run/web.pid
```

- [ ] **Step 5: Verify deployed API**

```bash
curl -fsS http://127.0.0.1:5173/api/health
curl -fsS -X POST http://127.0.0.1:5173/api/snmp/test -H 'Content-Type: application/json' -d '{"target":"192.168.1.10","version":"v2c","community":"public"}'
curl -fsS -X POST http://127.0.0.1:5173/api/snmp/walk -H 'Content-Type: application/json' -d '{"target":"192.168.1.10","version":"v2c","community":"public"}'
curl -fsS -X POST http://127.0.0.1:5173/api/template/classify -H 'Content-Type: application/json' -d '{"items":[{"oid":"1.3.6.1.2.1.2.2.1.10.1","name":"ifInOctets","value":"42","valueType":"counter"}]}'
curl -fsS -X POST http://127.0.0.1:5173/api/template/preview -H 'Content-Type: application/json' -d '{"templateName":"Template Zabtem Simulated SNMP","items":[{"oid":"1.3.6.1.2.1.1.3.0","name":"sysUpTime","group":"system","zabbixType":"SNMP_AGENT","valueType":"timeticks"}]}'
```

Expected: health JSON, reachable SNMP JSON, walk JSON with OIDs, classification JSON, and preview JSON containing `zabbix_export`.

---

## Self-Review

- Spec coverage: Current workbench design remains intact; this plan adds the missing backend capabilities that were marked planned: walk collection, OID classification, and template export preview.
- Placeholder scan: No TBD/TODO placeholders are present. Each task has file paths, concrete code, commands, and expected outcomes.
- Type consistency: Frontend `valueType`, `zabbixType`, and backend serde renames match across walk, classify, and preview payloads.
