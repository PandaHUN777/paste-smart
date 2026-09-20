/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Optional API root override, mirroring `TYPESAFE_BASE_URL`.
   *
   * The API key itself is intentionally not exposed here: it stays in the
   * Rust process (`src-tauri/src/api.rs`) and is never inlined into the
   * webview bundle — see `src/services/jev.ts`.
   */
  readonly TYPESAFE_BASE_URL?: string;
  /** Optional model override; defaults to `jev-latest`. */
  readonly TYPESAFE_DEFAULT_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
