use crate::models::{HistoricalData, TauriAnalysisResult, AnalysisSettings};

// ==========================================
// Constants & Defaults (Aligned with SSOT)
// ==========================================

pub const DEFAULT_RSI_PERIOD: usize = 14;
pub const DEFAULT_MFI_PERIOD: usize = 14;
pub const DEFAULT_BB_PERIOD: usize = 20;
pub const DEFAULT_BB_STD_DEV: f64 = 1.0;

pub const DEFAULT_RSI_THRESHOLD: f64 = 30.0;
pub const DEFAULT_MFI_THRESHOLD: f64 = 30.0;

// ==========================================
// Technical Analysis Functions
// ==========================================

/// Relative Strength Index (RSI) calculation
pub fn calculate_rsi(prices: &[f64], period: usize) -> f64 {
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

/// Money Flow Index (MFI) calculation
pub fn calculate_mfi(
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

/// Bollinger Bands calculation
pub fn calculate_bollinger_bands(prices: &[f64], period: usize, std_dev: f64) -> (f64, f64, f64) {
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

/// Perform high-level analysis on historical data
pub fn analyze_data(ticker: String, data: &HistoricalData, settings: Option<&AnalysisSettings>) -> TauriAnalysisResult {
    // 1. Determine parameters to use (Settings or Defaults)
    let rsi_period = settings.map(|s| s.rsi_period).unwrap_or(DEFAULT_RSI_PERIOD);
    let mfi_period = settings.map(|s| s.mfi_period).unwrap_or(DEFAULT_MFI_PERIOD);
    let bb_period = settings.map(|s| s.bb_period).unwrap_or(DEFAULT_BB_PERIOD);
    let bb_std_dev = settings.map(|s| s.bb_std_dev).unwrap_or(DEFAULT_BB_STD_DEV);
    
    let rsi_threshold = settings.map(|s| s.rsi_triple_signal).unwrap_or(DEFAULT_RSI_THRESHOLD);
    let mfi_threshold = settings.map(|s| s.mfi_triple_signal).unwrap_or(DEFAULT_MFI_THRESHOLD);

    if data.closes.len() < bb_period {
        return TauriAnalysisResult {
            ticker,
            current_price: *data.closes.last().unwrap_or(&0.0),
            rsi: 0.0,
            mfi: 0.0,
            bollinger_position: "inside".to_string(),
            bollinger_lower: 0.0,
            bollinger_upper: 0.0,
            bollinger_middle: 0.0,
            triple_signal: false,
            error: Some(format!("Not enough data (needs {})", bb_period)),
        };
    }

    let rsi = calculate_rsi(&data.adj_closes, rsi_period);
    let mfi = calculate_mfi(
        &data.highs,
        &data.lows,
        &data.adj_closes,
        &data.volumes,
        mfi_period,
    );
    let (bb_upper, bb_middle, bb_lower) =
        calculate_bollinger_bands(&data.adj_closes, bb_period, bb_std_dev);

    let current_price = *data.closes.last().unwrap_or(&0.0);
    let current_adj_search = *data.adj_closes.last().unwrap_or(&0.0);

    let mut bollinger_position = "inside".to_string();
    if current_adj_search <= bb_lower {
        bollinger_position = "below".to_string();
    } else if current_adj_search >= bb_upper {
        bollinger_position = "above".to_string();
    }

    // Triple Signal Condition: RSI < threshold AND MFI < threshold AND BB Touch (Below)
    let triple_signal = rsi < rsi_threshold
        && mfi < mfi_threshold
        && current_adj_search <= bb_lower;

    TauriAnalysisResult {
        ticker,
        current_price,
        rsi: (rsi * 100.0).round() / 100.0,
        mfi: (mfi * 100.0).round() / 100.0,
        bollinger_position,
        bollinger_lower: (bb_lower * 100.0).round() / 100.0,
        bollinger_upper: (bb_upper * 100.0).round() / 100.0,
        bollinger_middle: (bb_middle * 100.0).round() / 100.0,
        triple_signal,
        error: None,
    }
}

/// Calculate VIX rating and return category string
pub fn calculate_vix_rating(current: f64) -> &'static str {
    if current < 15.0 {
        "Low"
    } else if current < 20.0 {
        "Neutral"
    } else if current < 30.0 {
        "Elevated"
    } else {
        "High"
    }
}
