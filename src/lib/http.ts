import { invoke } from "@tauri-apps/api/core";
import type { Fetch } from "@typesafe-ai/sdk";

/** Mirrors `ApiResponse` in `src-tauri/src/api.rs`. */
interface ApiResponse {
  status: number;
  headers: [string, string][];
  body: string;
}

/** Statuses the `Response` constructor refuses to pair with a body. */
const BODILESS_STATUSES = new Set([101, 204, 205, 304]);

/**
 * Reject as soon as `signal` aborts, whichever settles first.
 *
 * The Rust request itself keeps running — a command in flight cannot be
 * cancelled — but its result is discarded, which is all the caller needs.
 */
function withAbort<T>(work: Promise<T>, signal?: AbortSignal | null): Promise<T> {
  if (!signal) return work;
  if (signal.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/**
 * A `fetch` implementation backed by a pooled Rust HTTP client.
 *
 * The webview cannot call the API directly (its origin is rejected by CORS),
 * and the generic HTTP plugin builds a new client per request, which costs a
 * fresh TLS handshake every time. Routing through our own command reuses one
 * warm connection instead.
 */
export const pooledFetch: Fetch = async (input, init) => {
  const request = new Request(input, init);

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const body = request.method === "GET" || request.method === "HEAD" ? null : await request.text();

  const response = await withAbort(
    invoke<ApiResponse>("api_request", {
      request: { url: request.url, method: request.method, headers, body },
    }),
    init?.signal,
  );

  return new Response(BODILESS_STATUSES.has(response.status) ? null : response.body, {
    status: response.status,
    headers: response.headers,
  });
};
