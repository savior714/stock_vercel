#[cfg_attr(mobile, tauri::mobile_entry_point)]
use serde::{Deserialize, Serialize};
use tauri::Manager;
use chrono::{DateTime, TimeZone};
use futures::future::join_all;
use std::sync::Arc;
use tokio::sync::Semaphore;
use std::time::Instant;

// ==========================================
// Yahoo Finance Data Structures
// ==========================================

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoricalData {
    pub dates: Vec<String>,
    pub opens: Vec<f64>,
    pub highs: Vec<f64>,
    pub lows: Vec<f64>,
    pub closes: Vec<f64>,
    pub adj_closes: Vec<f64>,
    pub volumes: Vec<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct YahooResponse {
    pub chart: YahooChart,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct YahooChart {
    pub result: Option<Vec<YahooResult>>,
    pub error: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct YahooResult {
    pub meta: YahooMeta,
    pub timestamp: Option<Vec<i64>>,
    pub indicators: YahooIndicators,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct YahooMeta {
    pub currency: Option<String>,
    pub symbol: String,
    pub regular_market_price: Option<f64>,
    pub previous_close: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct YahooIndicators {
    pub quote: Vec<YahooQuote>,
    pub adjclose: Option<Vec<YahooAdjClose>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct YahooQuote {
    pub open: Vec<Option<f64>>,
    pub high: Vec<Option<f64>>,
    pub low: Vec<Option<f64>>,
    pub close: Vec<Option<f64>>,
    pub volume: Vec<Option<u64>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct YahooAdjClose {
    pub adjclose: Vec<Option<f64>>,
}

// ==========================================
// Analysis Result Structure (Matches Client Type)
// ==========================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TauriAnalysisResult {
    pub ticker: String,
    pub current_price: f64,
    pub rsi: f64,
    pub mfi: f64,
    pub bollinger_position: String,
    pub bollinger_lower: f64,
    pub bollinger_upper: f64,
    pub bollinger_middle: f64,
    pub triple_signal: bool,
    pub error: Option<String>,
}

// ==========================================
// Technical Analysis Functions
// ==========================================

fn calculate_rsi(prices: &[f64], period: usize) -> f64 {
    if prices.len() < period + 1 {
        return 0.0;
    }

    let mut gains = 0.0;
    let mut losses = 0.0;

    // First average
    for i in 1..=period {
        let change = prices[i] - prices[i - 1];
        if change > 0.0 {
            gains += change;
        } else {
            losses += change.abs();
        }
    }

    let mut avg_gain = gains / period as f64;
    let mut avg_loss = losses / period as f64;

    // Smoothing
    for i in (period + 1)..prices.len() {
        let change = prices[i] - prices[i - 1];
        let current_gain = if change > 0.0 { change } else { 0.0 };
        let current_loss = if change < 0.0 { change.abs() } else { 0.0 };

        avg_gain = (avg_gain * (period as f64 - 1.0) + current_gain) / period as f64;
        avg_loss = (avg_loss * (period as f64 - 1.0) + current_loss) / period as f64;
    }

    if avg_loss == 0.0 {
        return 100.0;
    }

    let rs = avg_gain / avg_loss;
    100.0 - (100.0 / (1.0 + rs))
}

fn calculate_mfi(
    highs: &[f64],
    lows: &[f64],
    closes: &[f64],
    volumes: &[u64],
    period: usize,
) -> f64 {
    if closes.len() < period + 1 {
        return 0.0;
    }

    let len = closes.len();
    let mut typical_prices = Vec::with_capacity(len);
    let mut money_flows = Vec::with_capacity(len);

    for i in 0..len {
        let tp = (highs[i] + lows[i] + closes[i]) / 3.0;
        typical_prices.push(tp);
        money_flows.push(tp * volumes[i] as f64);
    }

    let mut pos_flow = 0.0;
    let mut neg_flow = 0.0;

    // Calculate flow for the last 'period' days
    for i in (len - period)..len {
        if i == 0 { continue; }
        if typical_prices[i] > typical_prices[i - 1] {
            pos_flow += money_flows[i];
        } else if typical_prices[i] < typical_prices[i - 1] {
            neg_flow += money_flows[i];
        }
    }

    if neg_flow == 0.0 {
        return 100.0;
    }

    let money_ratio = pos_flow / neg_flow;
    100.0 - (100.0 / (1.0 + money_ratio))
}

fn calculate_bollinger_bands(prices: &[f64], period: usize, std_dev: f64) -> (f64, f64, f64) {
    if prices.len() < period {
        return (0.0, 0.0, 0.0);
    }

    let recent_prices = &prices[(prices.len() - period)..];
    let sum: f64 = recent_prices.iter().sum();
    let mean = sum / period as f64;

    let variance: f64 = recent_prices
        .iter()
        .map(|value| {
            let diff = mean - *value;
            diff * diff
        })
        .sum::<f64>()
        / period as f64;

    let std = variance.sqrt();
    let upper = mean + (std * std_dev);
    let lower = mean - (std * std_dev);

    (upper, mean, lower)
}


// ==========================================
// User-Agent & Helper Functions
// ==========================================

const USER_AGENTS: &[&str] = &[
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
];

fn get_random_user_agent() -> &'static str {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos() as usize;
    USER_AGENTS[seed % USER_AGENTS.len()]
}


// ==========================================
// Tauri Commands
// ==========================================

#[tauri::command]
async fn fetch_stock_data(ticker: String) -> Result<HistoricalData, String> {
    let formatted_ticker = ticker.replace(".", "-");
    let url = format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}?range=6mo&interval=1d&includeAdjustedClose=true",
        formatted_ticker
    );
    
    println!("[Rust] Fetching data for: {}", formatted_ticker);
    use std::io::Write;
    let _ = std::io::stdout().flush();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .pool_idle_timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Client builder error: {}", e))?;

    let mut last_error = String::new();
    let mut fetched_data: Option<YahooResponse> = None;

    for attempt in 1..=3 {
        if attempt > 1 {
            println!("[Rust] Retry attempt {} for {}", attempt, formatted_ticker);
            tokio::time::sleep(std::time::Duration::from_millis(500 * (attempt - 1) as u64)).await;
        }

        let response_result = client
            .get(&url)
            .header("User-Agent", get_random_user_agent())
            .send()
            .await;

        match response_result {
            Ok(response) => {
                if response.status() == 429 {
                    println!("[Rust] Rate Limit (429) for {}", formatted_ticker);
                    last_error = "API_RATE_LIMIT".to_string();
                    continue;
                }

                if !response.status().is_success() {
                    println!("[Rust] HTTP Error {} for {}", response.status(), formatted_ticker);
                    last_error = format!("API error: HTTP {}", response.status());
                    continue;
                }
                
                println!("[Rust] Success fetch for {}", formatted_ticker);

                match response.json::<YahooResponse>().await {
                    Ok(data) => {
                        fetched_data = Some(data);
                        break;
                    },
                    Err(e) => {
                        last_error = format!("Parse error: {}", e);
                        continue;
                    }
                }
            }
            Err(e) => {
                println!("[Rust] Network error for {}: {}", formatted_ticker, e);
                last_error = format!("Network error: {}", e);
            }
        }
    }

    let data = fetched_data.ok_or(last_error)?;

    let result = data.chart.result
        .ok_or("No data available")?
        .into_iter()
        .next()
        .ok_or("Empty result")?;

    let timestamps = result.timestamp.unwrap_or_default();
    let quote = result.indicators.quote.first().ok_or("No quote data")?;
    
    let adj_closes = result.indicators.adjclose
        .and_then(|ac| ac.into_iter().next())
        .map(|ac| ac.adjclose)
        .unwrap_or_else(|| quote.close.clone());

    // Re-implementing date logic using chrono for accuracy and performance
    let dates: Vec<String> = timestamps.iter().map(|&ts| {
        // Yahoo Finance timestamps are Unix epoch seconds
        // Create DateTime<Utc> directly from timestamp
        match chrono::DateTime::from_timestamp(ts, 0) {
            Some(dt) => {
                // Format as YYYY-MM-DD
                dt.format("%Y-%m-%d").to_string()
            },
            None => {
                // Fallback for invalid timestamps
                format!("Invalid-Time-{}", ts)
            }
        }
    }).collect();

    Ok(HistoricalData {
        dates,
        opens: quote.open.iter().map(|v| v.unwrap_or(0.0)).collect(),
        highs: quote.high.iter().map(|v| v.unwrap_or(0.0)).collect(),
        lows: quote.low.iter().map(|v| v.unwrap_or(0.0)).collect(),
        closes: quote.close.iter().map(|v| v.unwrap_or(0.0)).collect(),
        adj_closes: adj_closes.iter().map(|v| v.unwrap_or(0.0)).collect(),
        volumes: quote.volume.iter().map(|v| v.unwrap_or(0)).collect(),
    })
}

#[tauri::command]
async fn analyze_stock(symbol: String) -> Result<TauriAnalysisResult, String> {
    perform_analysis(symbol).await
}

async fn perform_analysis(symbol: String) -> Result<TauriAnalysisResult, String> {
    let data = match fetch_stock_data(symbol.clone()).await {
        Ok(data) => data,
        Err(e) => return Ok(TauriAnalysisResult {
            ticker: symbol,
            current_price: 0.0,
            rsi: 0.0,
            mfi: 0.0,
            bollinger_position: "inside".to_string(),
            bollinger_lower: 0.0,
            bollinger_upper: 0.0,
            bollinger_middle: 0.0,
            triple_signal: false,
            error: Some(e),
        })
    };

    if data.closes.len() < 20 {
        return Ok(TauriAnalysisResult {
            ticker: symbol,
            current_price: *data.closes.last().unwrap_or(&0.0),
            rsi: 0.0,
            mfi: 0.0,
            bollinger_position: "inside".to_string(),
            bollinger_lower: 0.0,
            bollinger_upper: 0.0,
            bollinger_middle: 0.0,
            triple_signal: false,
            error: Some("Not enough data".to_string()),
        });
    }

    let rsi = calculate_rsi(&data.adj_closes, 14);
    let mfi = calculate_mfi(&data.highs, &data.lows, &data.adj_closes, &data.volumes, 14);
    let (bb_upper, bb_middle, bb_lower) = calculate_bollinger_bands(&data.adj_closes, 20, 1.0); // Match JS default (1.0)

    let current_price = *data.closes.last().unwrap_or(&0.0);
    // Use Adjusted Close for BB calculation comparison usually, but display Current Price
    let current_adj_search = *data.adj_closes.last().unwrap_or(&0.0);

    let mut bollinger_position = "inside".to_string();
    if current_adj_search <= bb_lower {
        bollinger_position = "below".to_string();
    } else if current_adj_search >= bb_upper {
        bollinger_position = "above".to_string();
    }

    // Triple Signal Condition: RSI < 35 AND MFI < 35 AND BB Touch (Below)
    // Note: User settings are client-side only for now. Server logic uses defaults.
    // Client will overwrite this 'triple_signal' based on settings.
    let triple_signal = rsi < 35.0 && mfi < 35.0 && current_adj_search <= bb_lower;

    println!("[Rust] Analysis Result for {}: Price=${:.2}, RSI={:.2}, MFI={:.2}", 
        symbol, current_price, rsi, mfi);

    Ok(TauriAnalysisResult {
        ticker: symbol,
        current_price,
        rsi: (rsi * 100.0).round() / 100.0,
        mfi: (mfi * 100.0).round() / 100.0,
        bollinger_position,
        bollinger_lower: (bb_lower * 100.0).round() / 100.0,
        bollinger_upper: (bb_upper * 100.0).round() / 100.0,
        bollinger_middle: (bb_middle * 100.0).round() / 100.0,
        triple_signal,
        error: None,
    })
}

#[tauri::command]
async fn analyze_multiple_stocks(tickers: Vec<String>) -> Vec<TauriAnalysisResult> {
    let start_time = Instant::now();
    let total_tickers = tickers.len();
    println!("[Rust] Starting batch analysis for {} tickers", total_tickers);
    use std::io::Write;
    let _ = std::io::stdout().flush();

    // Semaphore to limit concurrent requests
    // Increased to 4 for better performance while keeping safety
    let semaphore = Arc::new(Semaphore::new(4));
    let mut tasks = Vec::new();

    for ticker in tickers {
        let permit = semaphore.clone();
        
        let task = tokio::spawn(async move {
            // Acquire permit before proceeding
            let _permit = permit.acquire().await.unwrap();
            
            // Add a small random jitter to prevent exact simultaneous hits
            let jitter_ms = (rand::random::<u64>() % 40) + 10;
            tokio::time::sleep(tokio::time::Duration::from_millis(jitter_ms)).await;

            // Perform analysis (fetch + calc)
            match perform_analysis(ticker.clone()).await {
                Ok(res) => res,
                Err(e) => TauriAnalysisResult {
                    ticker,
                    current_price: 0.0,
                    rsi: 0.0,
                    mfi: 0.0,
                    bollinger_position: "inside".to_string(),
                    bollinger_lower: 0.0,
                    bollinger_upper: 0.0,
                    bollinger_middle: 0.0,
                    triple_signal: false,
                    error: Some(e),
                }
            }
        });
        tasks.push(task);
    }

    let results = join_all(tasks).await;

    // Process results from JoinHandle
    let final_results: Vec<TauriAnalysisResult> = results.into_iter().map(|res| {
        match res {
            Ok(inner_res) => inner_res,
            Err(e) => TauriAnalysisResult {
                ticker: "Unknown".to_string(),
                current_price: 0.0,
                rsi: 0.0,
                mfi: 0.0,
                bollinger_position: "inside".to_string(),
                bollinger_lower: 0.0,
                bollinger_upper: 0.0,
                bollinger_middle: 0.0,
                triple_signal: false,
                error: Some(format!("Task panic: {}", e)),
            }
        }
    }).collect();

    let duration = start_time.elapsed();
    println!("[Rust] Analyzed {} tickers in {:.2?}", total_tickers, duration);

    final_results
}

#[tauri::command]
async fn fetch_multiple_stocks(tickers: Vec<String>) -> Vec<Result<HistoricalData, String>> {
    let start_time = Instant::now();
    let total_tickers = tickers.len();
    println!("[Rust] Starting concurrent fetch for {} tickers", total_tickers);

    // Semaphore to limit concurrent requests to avoid 429 Rate Limits
    // Allowing 2 concurrent requests seems safe for Yahoo Finance
    let semaphore = Arc::new(Semaphore::new(2)); 
    let mut tasks = Vec::new();

    for ticker in tickers {
        let permit = semaphore.clone();
        
        let task = tokio::spawn(async move {
            // Acquire permit before proceeding
            let _permit = permit.acquire().await.unwrap();
            
            // Add a small random jitter to prevent exact simultaneous hits
            // (10ms to 50ms)
            let jitter_ms = (rand::random::<u64>() % 40) + 10;
            tokio::time::sleep(tokio::time::Duration::from_millis(jitter_ms)).await;

            fetch_stock_data(ticker).await
        });
        tasks.push(task);
    }

    let results = join_all(tasks).await;

    // Process results from JoinHandle
    let final_results: Vec<Result<HistoricalData, String>> = results.into_iter().map(|res| {
        match res {
            Ok(inner_res) => inner_res,
            Err(e) => Err(format!("Task execution error: {}", e)),
        }
    }).collect();

    let duration = start_time.elapsed();
    println!("[Rust] Fetched {} tickers in {:.2?}", total_tickers, duration);

    final_results
}

// ==========================================
// Market Indicators Command
// ==========================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketIndicatorsResult {
    pub fear_and_greed: IndicatorData,
    pub vix: IndicatorData,
    pub put_call_ratio: IndicatorData,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndicatorData {
    pub current: f64,
    pub rating: String,
    pub additional_info: Option<f64>, // e.g. previous close, 50-day avg
}

#[derive(Debug, Deserialize)]
struct CnnResponse {
    fear_and_greed: Option<CnnFearGreed>,
    put_call_options: Option<CnnDataSection>,
    market_volatility: Option<CnnDataSection>, // VIX fallback
}

#[derive(Debug, Deserialize)]
struct CnnFearGreed {
    score: f64,
    rating: String,
    previous_close: f64,
}

#[derive(Debug, Deserialize)]
struct CnnDataSection {
    data: Vec<CnnTimeSeries>,
    rating: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CnnTimeSeries {
    #[serde(rename = "x")]
    _x: f64, // timestamp (unused)
    y: f64, // value
}

#[tauri::command]
async fn fetch_market_indicators() -> Result<MarketIndicatorsResult, String> {
    println!("[Rust] Fetching market indicators...");
    use std::io::Write;
    let _ = std::io::stdout().flush();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Client builder error: {}", e))?;
    let _user_agent = get_random_user_agent();

    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert("Referer", "https://www.cnn.com/".parse().unwrap());
    headers.insert("Sec-Fetch-Dest", "empty".parse().unwrap());
    headers.insert("Sec-Fetch-Mode", "cors".parse().unwrap());
    headers.insert("Sec-Fetch-Site", "same-site".parse().unwrap());

    // 1. Fetch CNN Fear & Greed
    // Add timestamp to prevent caching
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let cnn_url = format!("https://production.dataviz.cnn.io/index/fearandgreed/graphdata?t={}", timestamp);
    
    let cnn_res = client.get(&cnn_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36")
        .headers(headers)
        .send()
        .await;

    let mut fg_score = 50.0;
    let mut fg_rating = "Neutral".to_string();
    let mut fg_prev = 50.0;
    
    let mut pc_ratio = 0.70;
    let mut pc_rating = "Neutral".to_string();

    // VIX Fallback data from CNN
    let mut cnn_vix = 20.0; 
    let mut cnn_vix_rating = "Neutral".to_string();

    if let Ok(res) = cnn_res {
        if res.status().is_success() {
            if let Ok(data) = res.json::<CnnResponse>().await {
                // Parse Fear & Greed
                if let Some(fg) = data.fear_and_greed {
                    fg_score = fg.score.round(); // Round to nearest integer
                    fg_rating = fg.rating;
                    fg_prev = fg.previous_close;
                }

                // Parse Put/Call
                if let Some(pc) = data.put_call_options {
                    if let Some(last) = pc.data.last() {
                        // CNN API의 y 값을 그대로 사용 (스케일 변환 없음)
                        // 소수점 4자리로 반올림
                        pc_ratio = (last.y * 10000.0).round() / 10000.0;
                    }
                    if let Some(r) = pc.rating {
                        pc_rating = r;
                    }
                }

                // Parse CNN VIX (Fallback)
                if let Some(mv) = data.market_volatility {
                    if let Some(last) = mv.data.last() {
                        cnn_vix = last.y;
                    }
                    if let Some(r) = mv.rating {
                        cnn_vix_rating = r;
                    }
                }
            } else {
                println!("Failed to parse CNN JSON");
            }
        } else {
            println!("CNN API Error: {}", res.status());
        }
    } else {
        println!("CNN Connection Failed");
    }

    // 2. Fetch VIX from Yahoo (Primary)
    let vix_data = fetch_stock_data("^VIX".to_string()).await;
    
    let (vix_current, vix_rating, vix_avg) = match vix_data {
        Ok(data) => {
            let current = *data.closes.last().unwrap_or(&cnn_vix);
            let avg = if data.closes.len() > 50 {
                let sum: f64 = data.closes.iter().rev().take(50).sum();
                sum / 50.0
            } else {
                current
            };
            
            let rating = if current < 15.0 { "Low" }
            else if current < 20.0 { "Neutral" }
            else if current < 30.0 { "Elevated" }
            else { "High" };

            (current, rating.to_string(), avg)
        },
        Err(_) => (cnn_vix, cnn_vix_rating, cnn_vix) // Fallback to CNN data
    };

    Ok(MarketIndicatorsResult {
        fear_and_greed: IndicatorData {
            current: fg_score,
            rating: fg_rating,
            additional_info: Some(fg_prev),
        },
        vix: IndicatorData {
            current: (vix_current * 100.0).round() / 100.0,
            rating: vix_rating,
            additional_info: Some((vix_avg * 100.0).round() / 100.0),
        },
        put_call_ratio: IndicatorData {
            current: pc_ratio,
            rating: pc_rating,
            additional_info: None,
        },
    })
}

#[tauri::command]
async fn set_always_on_top(app: tauri::AppHandle, enable: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.set_always_on_top(enable).map_err(|e| e.to_string())?;
        println!("[Rust] set_always_on_top({}) success", enable);
        Ok(())
    } else {
        Err("Main window not found".to_string())
    }
}

#[cfg(target_os = "windows")]
use windows::core::Interface;

#[tauri::command]
async fn set_shadow(app: tauri::AppHandle, enable: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.set_shadow(enable).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
async fn set_ignore_cursor_events(app: tauri::AppHandle, ignore: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.set_ignore_cursor_events(ignore).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Main window not found".to_string())
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;
                use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Controller2;
                
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
            fetch_stock_data,
            fetch_multiple_stocks,
            analyze_stock,
            analyze_multiple_stocks,
            fetch_market_indicators,
            set_always_on_top,
            set_shadow,
            set_ignore_cursor_events
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
