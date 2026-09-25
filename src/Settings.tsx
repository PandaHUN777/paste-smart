import { getCurrentWindow } from "@tauri-apps/api/window";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import { useEscapeKey } from "./hooks/useEscapeKey";
import { hasApiKey, isAutostartEnabled, setApiKey, setAutostartEnabled } from "./lib/commands";

type SaveState = "idle" | "saving" | "error";
type AutostartState = "loading" | "idle" | "saving";

const describeError = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/** Settings window for the TypeSafe API key and Windows startup preference. */
function Settings() {
  const [keyInput, setKeyInput] = useState("");
  const [alreadyConfigured, setAlreadyConfigured] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [startsWithWindows, setStartsWithWindows] = useState(false);
  const [autostartState, setAutostartState] = useState<AutostartState>("loading");
  const [autostartError, setAutostartError] = useState<string | null>(null);

  const refreshAutostart = useCallback(() => {
    setAutostartState("loading");
    setAutostartError(null);
    void isAutostartEnabled()
      .then((enabled) => {
        setStartsWithWindows(enabled);
        setAutostartState("idle");
      })
      .catch((caught: unknown) => {
        setAutostartState("idle");
        setAutostartError(describeError(caught, "Failed to read the Windows startup setting."));
      });
  }, []);

  useEffect(() => {
    void hasApiKey().then(setAlreadyConfigured);
    refreshAutostart();
  }, [refreshAutostart]);

  // The window is preloaded once and reused (hidden, not destroyed) rather
  // than rebuilt on every open — see `settings_window.rs::preload` — so its
  // own state has to be refreshed on each reopen instead of via remount.
  useEffect(() => {
    const window = getCurrentWindow();
    const unlisten = window.onFocusChanged(({ payload: focused }) => {
      if (!focused) return;
      setKeyInput("");
      setSaveState("idle");
      setError(null);
      void hasApiKey().then(setAlreadyConfigured);
      refreshAutostart();
    });
    return () => void unlisten.then((stop) => stop());
  }, [refreshAutostart]);

  // Hidden rather than closed, so the next open reuses the already-loaded
  // window instead of paying WebView2's startup cost again.
  const close = useCallback(() => void getCurrentWindow().hide(), []);
  useEscapeKey(true, close);

  const handleAutostartChange = useCallback(
    async (enabled: boolean) => {
      const previous = startsWithWindows;
      setStartsWithWindows(enabled);
      setAutostartState("saving");
      setAutostartError(null);

      try {
        await setAutostartEnabled(enabled);
      } catch (caught) {
        setStartsWithWindows(previous);
        setAutostartError(describeError(caught, "Failed to update the Windows startup setting."));
      } finally {
        setAutostartState("idle");
      }
    },
    [startsWithWindows],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSaveState("saving");
      setError(null);
      try {
        await setApiKey(keyInput);
        close();
      } catch (caught) {
        setSaveState("error");
        setError(describeError(caught, "Failed to save the key."));
      }
    },
    [keyInput, close],
  );

  return (
    <div className="overlay">
      <header className="overlay__header">
        <div className="overlay__target" data-tauri-drag-region>
          <span className="overlay__app">Settings</span>
          <span className="overlay__title">API key and startup</span>
        </div>
        <button className="overlay__close" type="button" onClick={close} aria-label="Close">
          ✕
        </button>
      </header>
      <main className="overlay__body settings">
        <section className="settings__section">
          <span className="settings__section-title">TypeSafe API key</span>
          <p className="settings__hint">
            {alreadyConfigured
              ? "A key is already saved. Paste a new one to replace it."
              : "Paste your TypeSafe API key to enable Smart Paste."}
          </p>
          <form className="settings__form" onSubmit={(event) => void handleSubmit(event)}>
            <input
              className="settings__input"
              type="password"
              value={keyInput}
              onChange={(event) => setKeyInput(event.target.value)}
              placeholder="apikey_…"
              autoFocus
            />
            {error && (
              <p className="status status--error" role="alert">
                {error}
              </p>
            )}
            <div className="settings__actions">
              <button type="button" className="settings__cancel" onClick={close}>
                Cancel
              </button>
              <button
                type="submit"
                className="settings__save"
                disabled={saveState === "saving" || keyInput.trim().length === 0}
              >
                {saveState === "saving" ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </section>

        <section className="settings__section settings__section--startup">
          <span className="settings__section-title">Startup</span>
          <label className="settings__startup">
            <input
              type="checkbox"
              checked={startsWithWindows}
              disabled={autostartState !== "idle"}
              onChange={(event) => void handleAutostartChange(event.target.checked)}
            />
            <span>
              <span className="settings__startup-title">Start Smart Paste when Windows starts</span>
              <span className="settings__startup-hint">Launch silently in the system tray.</span>
            </span>
          </label>
          {autostartState === "loading" && <p className="status">Checking startup setting…</p>}
          {autostartState === "saving" && <p className="status">Updating startup setting…</p>}
          {autostartError && (
            <p className="status status--error" role="alert">
              {autostartError}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

export default Settings;
