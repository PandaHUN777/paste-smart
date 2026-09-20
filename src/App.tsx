import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import "./App.css";

function App() {
  const [info, setInfo] = useState("Loading...");

  useEffect(() => {
    async function test() {
      try {
        // Test 1: custom command
        const [title, app] = await invoke<[string, string]>("get_active_context");

        // Test 2: clipboard plugin
        const clipboard = await readText();

        setInfo(`Active window: ${title} (${app})\nClipboard: ${clipboard || "(empty)"}`);
      } catch (err) {
        setInfo("Error: " + String(err));
        console.error(err);
      }
    }

    test();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
      <h2>Tauri Test</h2>
      {info}
    </div>
  );
}

export default App;
