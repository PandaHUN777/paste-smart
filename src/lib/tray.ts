import { invoke } from "@tauri-apps/api/core";

/** Show the number of tracked clipboard entries in the tray tooltip. */
export function setTrayStatus(items: number): Promise<void> {
  return invoke<void>("set_tray_status", { items });
}
