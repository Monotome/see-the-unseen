mod crypto;

use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, State,
};

struct InitialFile(Mutex<Option<String>>);

/// Returns true for an argument that looks like a real file path rather than
/// a flag or an internal Tauri/WebKit URI.
fn is_file_arg(arg: &str) -> bool {
    !arg.is_empty() && !arg.starts_with('-') && !arg.starts_with("tauri://")
}

fn focus_main_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// Called by the frontend on startup to consume a file path that arrived before
/// the webview was ready (Windows/Linux cold-start via argv, or early macOS
/// Apple Event). Returns `null` when no file was queued.
#[tauri::command]
fn take_open_file_request(state: State<'_, InitialFile>) -> Option<String> {
    state.0.lock().unwrap().take()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Windows/Linux cold-start: the installer passes the file path as argv[1].
    // macOS cold-start arrives later via RunEvent::Opened (see .run() callback).
    #[cfg(not(target_os = "macos"))]
    let initial_path = std::env::args().nth(1).filter(|p| is_file_arg(p));
    #[cfg(target_os = "macos")]
    let initial_path: Option<String> = None;

    let builder = tauri::Builder::default()
        .manage(InitialFile(Mutex::new(initial_path)))
        // Windows/Linux hot-path: a second launch forwards argv to this callback.
        // On macOS the OS prevents a second launch entirely; hot-path comes via
        // RunEvent::Opened instead, so we skip the plugin there.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            focus_main_window(app);
            if let Some(path) = argv.into_iter().nth(1).filter(|p| is_file_arg(p)) {
                let _ = app.emit("open-file", path);
            }
        }))
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("See the Unseen")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            if w.is_visible().unwrap_or(false) {
                                let _ = w.hide();
                            } else {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            crypto::encrypt_content,
            crypto::decrypt_content,
            take_open_file_request,
        ]);

    builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            // macOS: both cold-start and hot-path file opens arrive as Apple Events.
            // We store the path for the cold-start poll AND emit for the hot-path
            // listener. Emitting before the webview is ready is harmless — the event
            // is simply lost, and the frontend poll will recover the stored path.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &event {
                let paths: Vec<String> = urls
                    .iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .filter_map(|p| p.to_str().map(String::from))
                    .collect();
                if let Some(first) = paths.into_iter().next() {
                    {
                        let state = _app_handle.state::<InitialFile>();
                        *state.0.lock().unwrap() = Some(first.clone());
                    }
                    let _ = _app_handle.emit("open-file", first);
                    focus_main_window(_app_handle);
                }
            }
            let _ = event;
        });
}
