use serde::{Deserialize, Serialize};

// ==========================================
// Yahoo Finance Data Structures
// ==========================================

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisSettings {
    pub rsi_period: usize,
    pub rsi_oversold: f64,
    pub rsi_triple_signal: f64,
    pub mfi_period: usize,
    pub mfi_oversold: f64,
    pub mfi_triple_signal: f64,
    pub bb_period: usize,
    pub bb_std_dev: f64,
}

// ==========================================
// Market Indicators Related Structures
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
pub struct CnnResponse {
    pub fear_and_greed: Option<CnnFearGreed>,
    pub put_call_options: Option<CnnDataSection>,
    pub market_volatility: Option<CnnDataSection>, // VIX fallback
}

#[derive(Debug, Deserialize)]
pub struct CnnFearGreed {
    pub score: f64,
    pub rating: String,
    pub previous_close: f64,
}

#[derive(Debug, Deserialize)]
pub struct CnnDataSection {
    pub data: Vec<CnnTimeSeries>,
    pub rating: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CnnTimeSeries {
    #[serde(rename = "x")]
    pub _x: f64, // timestamp (unused)
    pub y: f64, // value
}
