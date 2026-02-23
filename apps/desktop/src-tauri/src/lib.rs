use tauri::Manager;

#[tauri::command]
fn capture_screenshot_data_url(window: tauri::Window) -> Result<String, String> {
    use base64::Engine;
    use image::codecs::png::PngEncoder;
    use image::{ColorType, ImageEncoder};
    use screenshots::Screen;

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

    let monitor_position = monitor.position();
    let monitor_size = monitor.size();

    let screens = Screen::all().map_err(|e| format!("failed to enumerate screens: {e}"))?;
    let target_screen = screens
        .into_iter()
        .find(|screen| {
            let info = screen.display_info;
            info.x == monitor_position.x
                && info.y == monitor_position.y
                && info.width == monitor_size.width
                && info.height == monitor_size.height
        })
        .ok_or_else(|| "target screen not found".to_string())?;

    let image = target_screen
        .capture()
        .map_err(|e| format!("failed to capture screen: {e}"))?;

    let mut png = Vec::new();
    let encoder = PngEncoder::new(&mut png);
    encoder
        .write_image(
            image.as_raw(),
            image.width(),
            image.height(),
            ColorType::Rgba8.into(),
        )
        .map_err(|e| format!("failed to encode png: {e}"))?;

    let encoded = base64::engine::general_purpose::STANDARD.encode(png);
    Ok(format!("data:image/png;base64,{encoded}"))
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
