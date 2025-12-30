#[cfg_attr(mobile, tauri::mobile_entry_point)]
use serde::{Deserialize, Serialize};

// Yahoo Finance API 응답 구조체
#[derive(Debug, Serialize, Deserialize)]
pub struct StockData {
    pub ticker: String,
    pub current_price: f64,
    pub previous_close: f64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub volume: u64,
    pub timestamp: i64,
}

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

// User-Agent 목록 (차단 방지용)
const USER_AGENTS: &[&str] = &[
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

fn get_random_user_agent() -> &'static str {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos() as usize;
    USER_AGENTS[seed % USER_AGENTS.len()]
}

// Yahoo Finance API에서 주가 데이터 가져오기
#[tauri::command]
async fn fetch_stock_data(ticker: String) -> Result<HistoricalData, String> {
    // Yahoo Finance API 호환을 위해 . -> - 변환
    let formatted_ticker = ticker.replace(".", "-");
    
    let url = format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}?range=6mo&interval=1d&includeAdjustedClose=true",
        formatted_ticker
    );
    
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("User-Agent", get_random_user_agent())
        .send()
        .await
        .map_err(|e| format!("Failed to fetch data: {}", e))?;
    
    if response.status() == 429 {
        return Err("Yahoo Finance API 요청 한도 초과. 잠시 후 다시 시도해주세요.".to_string());
    }
    
    if !response.status().is_success() {
        return Err(format!("API error: HTTP {}", response.status()));
    }
    
    let data: YahooResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    let result = data.chart.result
        .ok_or("No data available for this ticker")?
        .into_iter()
        .next()
        .ok_or("Empty result set")?;
    
    let timestamps = result.timestamp.unwrap_or_default();
    let quote = result.indicators.quote.first()
        .ok_or("No quote data")?;
    
    let adj_closes = result.indicators.adjclose
        .and_then(|ac| ac.into_iter().next())
        .map(|ac| ac.adjclose)
        .unwrap_or_else(|| quote.close.clone());
    
    // 날짜 포맷팅
    let dates: Vec<String> = timestamps.iter()
        .map(|ts| {
            let secs = *ts;
            // Simple date formatting (YYYY-MM-DD)
            let days = secs / 86400;
            let years = 1970 + days / 365;
            let remaining_days = days % 365;
            let months = remaining_days / 30 + 1;
            let day = remaining_days % 30 + 1;
            format!("{}-{:02}-{:02}", years, months.min(12), day.min(28))
        })
        .collect();
    
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

// 여러 티커 분석
#[tauri::command]
async fn fetch_multiple_stocks(tickers: Vec<String>) -> Vec<Result<HistoricalData, String>> {
    let mut results = Vec::new();
    
    for ticker in tickers {
        let result = fetch_stock_data(ticker.clone()).await;
        results.push(result);
        // Rate limiting - 500ms delay between requests
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    }
    
    results
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
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
            fetch_multiple_stocks
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
