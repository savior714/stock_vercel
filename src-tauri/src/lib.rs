pub mod models;
pub mod analysis;
pub mod commands;

use crate::commands::{stock, market, window};

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::time::Instant;
use crate::models::HistoricalData;

pub struct AppState {
    pub client: reqwest::Client,
    pub cache: Arc<RwLock<HashMap<String, (HistoricalData, Instant)>>>,
}

pub fn run() {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .pool_idle_timeout(std::time::Duration::from_secs(15))
        .build()
        .expect("Failed to create reqwest client");

    let cache = Arc::new(RwLock::new(HashMap::new()));
    
    tauri::Builder::default()
        .manage(AppState { client, cache })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;
                use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Controller2;
                use windows::core::Interface;

                let window = app.get_webview_window("main").unwrap();
                let _ = window.with_webview(|webview| {
                    unsafe {
                        let controller: ICoreWebView2Controller2 = webview.controller().cast().unwrap();
                        let _ = controller.SetDefaultBackgroundColor(webview2_com::Microsoft::Web::WebView2::Win32::COREWEBVIEW2_COLOR { 
                            R: 0, G: 0, B: 0, A: 0 
                        });
                    }
                });
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            stock::fetch_stock_data,
            stock::fetch_multiple_stocks,
            stock::analyze_stock,
            stock::analyze_multiple_stocks,
            market::fetch_market_indicators,
            window::set_always_on_top,
            window::set_shadow,
            window::set_ignore_cursor_events
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
