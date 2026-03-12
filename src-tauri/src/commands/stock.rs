use crate::models::{HistoricalData, TauriAnalysisResult, YahooResponse, AnalysisSettings};
use crate::analysis;
use crate::AppState;
use futures::future::join_all;
use std::sync::Arc;
use tokio::sync::Semaphore;
use std::time::Instant;
use tauri::State;

// ==========================================
// User-Agent & Helper Functions
// ==========================================

const USER_AGENTS: &[&str] = &[
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
];

const CACHE_TTL_SECONDS: u64 = 300; // 5 minutes

pub fn get_random_user_agent() -> &'static str {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos() as usize;
    USER_AGENTS[seed % USER_AGENTS.len()]
}

// ==========================================
// Commands
// ==========================================

#[tauri::command]
pub async fn fetch_stock_data(
    ticker: String,
    state: State<'_, AppState>
) -> Result<HistoricalData, String> {
    fetch_stock_data_internal(ticker, &state).await
}

pub async fn fetch_stock_data_internal(
    ticker: String,
    state: &AppState
) -> Result<HistoricalData, String> {
    let formatted_ticker = ticker.replace(".", "-");

    // 1. Check Cache
    {
        let cache = state.cache.read().await;
        if let Some((data, last_fetch)) = cache.get(&formatted_ticker) {
            if last_fetch.elapsed().as_secs() < CACHE_TTL_SECONDS {
                println!("[Rust] Cache Hit for: {}", formatted_ticker);
                return Ok(data.clone());
            }
        }
    }

    let url = format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}?range=6mo&interval=1d&includeAdjustedClose=true",
        formatted_ticker
    );
    
    println!("[Rust] Fetching data for: {}", formatted_ticker);
    use std::io::Write;
    let _ = std::io::stdout().flush();

    let mut last_error = String::new();
    let mut fetched_data: Option<YahooResponse> = None;

    for attempt in 1..=3 {
        if attempt > 1 {
            println!("[Rust] Retry attempt {} for {}", attempt, formatted_ticker);
            tokio::time::sleep(std::time::Duration::from_millis(500 * (attempt - 1) as u64)).await;
        }

        let response_result = state.client
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

    let dates: Vec<String> = timestamps.iter().map(|&ts| {
        match chrono::DateTime::from_timestamp(ts, 0) {
            Some(dt) => dt.format("%Y-%m-%d").to_string(),
            None => format!("Invalid-Time-{}", ts)
        }
    }).collect();

    let historical_data = HistoricalData {
        dates,
        opens: quote.open.iter().map(|v| v.unwrap_or(0.0)).collect(),
        highs: quote.high.iter().map(|v| v.unwrap_or(0.0)).collect(),
        lows: quote.low.iter().map(|v| v.unwrap_or(0.0)).collect(),
        closes: quote.close.iter().map(|v| v.unwrap_or(0.0)).collect(),
        adj_closes: adj_closes.iter().map(|v| v.unwrap_or(0.0)).collect(),
        volumes: quote.volume.iter().map(|v| v.unwrap_or(0)).collect(),
    };

    // 5. Update Cache
    {
        let mut cache = state.cache.write().await;
        cache.insert(formatted_ticker, (historical_data.clone(), Instant::now()));
    }

    Ok(historical_data)
}

#[tauri::command]
pub async fn analyze_stock(
    symbol: String,
    settings: Option<AnalysisSettings>,
    state: State<'_, AppState>
) -> Result<TauriAnalysisResult, String> {
    perform_analysis(symbol, settings, &state).await
}

pub async fn perform_analysis(
    symbol: String,
    settings: Option<AnalysisSettings>,
    state: &AppState
) -> Result<TauriAnalysisResult, String> {
    let data = match fetch_stock_data_internal(symbol.clone(), state).await {
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

    let result = analysis::analyze_data(symbol.clone(), &data, settings.as_ref());

    println!("[Rust] Analysis Result for {}: Price=${:.2}, RSI={:.2}, MFI={:.2}", 
        symbol, result.current_price, result.rsi, result.mfi);

    Ok(result)
}

#[tauri::command]
pub async fn analyze_multiple_stocks(
    tickers: Vec<String>,
    settings: Option<AnalysisSettings>,
    state: State<'_, AppState>
) -> Result<Vec<TauriAnalysisResult>, String> {
    let start_time = Instant::now();
    let total_tickers = tickers.len();
    println!("[Rust] Starting batch analysis for {} tickers", total_tickers);
    use std::io::Write;
    let _ = std::io::stdout().flush();

    let semaphore = Arc::new(Semaphore::new(4));
    let client = state.client.clone();
    let cache = state.cache.clone();
    let opt_settings = settings.clone();
    let mut tasks = Vec::new();

    for ticker in tickers {
        let permit = semaphore.clone();
        let current_client = client.clone();
        let current_cache = cache.clone();
        let current_settings = opt_settings.clone();
        
        let task = tokio::spawn(async move {
            let _permit = permit.acquire().await.unwrap();
            
            // Re-construct a temporary state-like struct for the task
            let temp_state = AppState {
                client: current_client,
                cache: current_cache,
            };

            let jitter_ms = (rand::random::<u64>() % 40) + 10;
            tokio::time::sleep(tokio::time::Duration::from_millis(jitter_ms)).await;

            match perform_analysis(ticker.clone(), current_settings, &temp_state).await {
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

    Ok(final_results)
}

#[tauri::command]
pub async fn fetch_multiple_stocks(
    tickers: Vec<String>,
    state: State<'_, AppState>
) -> Result<Vec<Result<HistoricalData, String>>, String> {
    let start_time = Instant::now();
    let total_tickers = tickers.len();
    println!("[Rust] Starting concurrent fetch for {} tickers", total_tickers);

    let semaphore = Arc::new(Semaphore::new(2)); 
    let client = state.client.clone();
    let cache = state.cache.clone();
    let mut tasks = Vec::new();

    for ticker in tickers {
        let permit = semaphore.clone();
        let current_client = client.clone();
        let current_cache = cache.clone();
        
        let task = tokio::spawn(async move {
            let _permit = permit.acquire().await.unwrap();
            
            let temp_state = AppState {
                client: current_client,
                cache: current_cache,
            };

            let jitter_ms = (rand::random::<u64>() % 40) + 10;
            tokio::time::sleep(tokio::time::Duration::from_millis(jitter_ms)).await;

            fetch_stock_data_internal(ticker, &temp_state).await
        });
        tasks.push(task);
    }

    let results = join_all(tasks).await;

    let final_results: Vec<Result<HistoricalData, String>> = results.into_iter().map(|res| {
        match res {
            Ok(inner_res) => inner_res,
            Err(e) => Err(format!("Task execution error: {}", e)),
        }
    }).collect();

    let duration = start_time.elapsed();
    println!("[Rust] Fetched {} tickers in {:.2?}", total_tickers, duration);

    Ok(final_results)
}
