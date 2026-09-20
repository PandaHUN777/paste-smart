//! A pooled HTTP client for the Jev API.
//!
//! The generic HTTP plugin builds a fresh `reqwest::Client` per call, so every
//! Smart Paste paid a full DNS + TCP + TLS handshake — roughly 700 ms before a
//! single request byte left the machine. One long-lived client keeps the
//! connection open between pastes, and a background ping stops it going idle,
//! so the hotkey usually spends nothing on setup.

use std::collections::HashMap;
use std::sync::OnceLock;
use std::time::Duration;

use serde::{Deserialize, Serialize};

/// Only this origin may be reached. The webview hands us a URL, so the host is
/// pinned here rather than trusted from the frontend.
const API_ORIGIN: &str = "https://api.typesafe.ai";

/// How long an unused connection is kept in the pool.
const POOL_IDLE_TIMEOUT: Duration = Duration::from_secs(300);

/// How often the connection is exercised so the next paste finds it warm.
/// One tiny request per minute is cheap next to the handshake it avoids.
const WARM_UP_INTERVAL: Duration = Duration::from_secs(60);

/// Ceiling for a Smart Paste request, well beyond normal inference time.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(20);

/// Upper bound for the warm-up ping, which must never outlive its interval.
const WARM_UP_TIMEOUT: Duration = Duration::from_secs(10);

/// Headers describing a transfer encoding we have already undone by the time
/// the body reaches the webview; forwarding them would mislead `Response`.
const STRIPPED_HEADERS: [&str; 2] = ["content-encoding", "content-length"];

static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

static API_KEY: OnceLock<String> = OnceLock::new();

/// Load `.env` from the repo root, next to `src-tauri`.
///
/// A missing file is fine — a real environment variable set on the host
/// (the normal case in production) takes over instead.
pub fn load_env() {
    if let Some(root) = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).parent() {
        let _ = dotenvy::from_path(root.join(".env"));
    }
}

/// The key used to authenticate with the Jev API.
///
/// Read once from the environment. It never reaches the webview: the SDK
/// running there is given a placeholder, and every real request gets its
/// `Authorization` header attached here instead.
fn api_key() -> Result<&'static str, String> {
    let key = API_KEY.get_or_init(|| std::env::var("TYPESAFE_API_KEY").unwrap_or_default());
    if key.is_empty() {
        return Err(
            "TYPESAFE_API_KEY is not set. Add it to .env (dev) or the host environment (production)."
                .to_string(),
        );
    }
    Ok(key.as_str())
}

/// The shared client. Cloning is cheap; the connection pool is what matters.
fn client() -> &'static reqwest::Client {
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .pool_idle_timeout(POOL_IDLE_TIMEOUT)
            .tcp_keepalive(POOL_IDLE_TIMEOUT)
            .timeout(REQUEST_TIMEOUT)
            .build()
            .expect("failed to build the HTTP client")
    })
}

/// Open the connection at startup and keep it from going idle.
///
/// Failures are ignored: a cold connection is a slow paste, not a broken one.
pub fn warm_up() {
    tauri::async_runtime::spawn(async {
        loop {
            if let Ok(response) = client()
                .head(API_ORIGIN)
                .timeout(WARM_UP_TIMEOUT)
                .send()
                .await
            {
                // The body must be drained before the connection returns to
                // the pool, otherwise the socket is dropped and this was moot.
                let _ = response.bytes().await;
            }
            tokio::time::sleep(WARM_UP_INTERVAL).await;
        }
    });
}

/// A `fetch` call forwarded from the webview.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiRequest {
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
}

/// Enough of a `Response` for the webview to rebuild one.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    status: u16,
    headers: Vec<(String, String)>,
    body: String,
}

/// Perform a request against the Jev API over the pooled connection.
#[tauri::command]
pub async fn api_request(request: ApiRequest) -> Result<ApiResponse, String> {
    if !request.url.starts_with(API_ORIGIN) {
        return Err(format!("Refusing to call a host other than {API_ORIGIN}"));
    }

    let method = reqwest::Method::from_bytes(request.method.as_bytes())
        .map_err(|_| format!("Unsupported HTTP method: {}", request.method))?;

    let mut builder = client().request(method, &request.url);
    for (name, value) in &request.headers {
        // The webview's SDK sets its own placeholder Authorization header;
        // the real key is attached below instead of forwarded from the frontend.
        if name.eq_ignore_ascii_case("authorization") {
            continue;
        }
        builder = builder.header(name, value);
    }
    builder = builder.header("authorization", format!("Bearer {}", api_key()?));
    if let Some(body) = request.body {
        builder = builder.body(body);
    }

    let response = builder.send().await.map_err(|e| e.to_string())?;
    let status = response.status().as_u16();
    let headers = response
        .headers()
        .iter()
        .filter(|(name, _)| !STRIPPED_HEADERS.contains(&name.as_str()))
        .filter_map(|(name, value)| {
            value
                .to_str()
                .ok()
                .map(|value| (name.to_string(), value.to_string()))
        })
        .collect();
    let body = response.text().await.map_err(|e| e.to_string())?;

    Ok(ApiResponse {
        status,
        headers,
        body,
    })
}
