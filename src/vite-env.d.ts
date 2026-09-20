/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * TypeSafe (Jev) API key, read from the `TYPESAFE_API_KEY` environment
   * variable at build time — see `envPrefix` in `vite.config.ts`.
   */
  readonly TYPESAFE_API_KEY?: string;
  /** Optional API root override, mirroring `TYPESAFE_BASE_URL`. */
  readonly TYPESAFE_BASE_URL?: string;
  /** Optional model override; defaults to `jev-latest`. */
  readonly TYPESAFE_DEFAULT_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
