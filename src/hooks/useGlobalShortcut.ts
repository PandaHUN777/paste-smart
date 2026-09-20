import { useEffect, useRef } from "react";
import { isRegistered, register, unregister } from "@tauri-apps/plugin-global-shortcut";

/**
 * Register a system-wide accelerator for as long as the component is mounted.
 *
 * The handler is held in a ref so changing it does not re-register the
 * shortcut, which would briefly leave the hotkey dead.
 */
export function useGlobalShortcut(accelerator: string, handler: () => void): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    let active = true;

    const setup = async (): Promise<void> => {
      try {
        // A stale registration survives hot reloads in development.
        if (await isRegistered(accelerator)) {
          await unregister(accelerator);
        }
        if (!active) return;
        await register(accelerator, (event) => {
          if (event.state === "Pressed") handlerRef.current();
        });
      } catch (error) {
        console.error(`Failed to register ${accelerator}:`, error);
      }
    };

    void setup();

    return () => {
      active = false;
      void unregister(accelerator).catch(() => undefined);
    };
  }, [accelerator]);
}
