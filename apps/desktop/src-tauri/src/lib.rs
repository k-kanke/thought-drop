use tauri::Manager;

#[tauri::command]
fn capture_screenshot_data_url(window: tauri::Window) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use base64::Engine;
        use std::fs;
        use std::process::Command;
        use std::time::{SystemTime, UNIX_EPOCH};

        let monitor = window
            .current_monitor()
            .map_err(|e| format!("failed to get current monitor: {e}"))?
            .or_else(|| {
                window
                    .primary_monitor()
                    .map_err(|e| format!("failed to get primary monitor: {e}"))
                    .ok()
                    .flatten()
            })
            .ok_or_else(|| "monitor not found".to_string())?;

        let position = monitor.position();
        let size = monitor.size();
        let capture_rect = format!("{},{},{},{}", position.x, position.y, size.width, size.height);

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| format!("failed to read system time: {e}"))?
            .as_millis();
        let temp_path = std::env::temp_dir().join(format!("thought_drop_capture_{timestamp}.png"));

        let status = Command::new("screencapture")
            .arg("-x")
            .arg("-t")
            .arg("png")
            .arg("-R")
            .arg(capture_rect)
            .arg(&temp_path)
            .status()
            .map_err(|e| format!("failed to launch screencapture: {e}"))?;

        if !status.success() {
            return Err("screencapture command failed".to_string());
        }

        let bytes = fs::read(&temp_path).map_err(|e| format!("failed to read capture file: {e}"))?;
        let _ = fs::remove_file(&temp_path);

        let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
        return Ok(format!("data:image/png;base64,{encoded}"));
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("screenshot command is not implemented on this OS yet".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![capture_screenshot_data_url])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_always_on_top(true);
                #[cfg(target_os = "macos")]
                let _ = window.set_visible_on_all_workspaces(true);
            }
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
