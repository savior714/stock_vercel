<?php
/**
 * Yahoo Finance API Proxy for Synology NAS
 * 배치 요청 지원 + 세션 유지 + 랜덤 지연
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ticker 또는 symbol 파라미터 (콤마로 구분된 여러 티커 지원)
$symbolsParam = '';
if (isset($_GET['tickers']) && !empty($_GET['tickers'])) {
    $symbolsParam = trim($_GET['tickers']);
} elseif (isset($_GET['ticker']) && !empty($_GET['ticker'])) {
    $symbolsParam = trim($_GET['ticker']);
} elseif (isset($_GET['symbol']) && !empty($_GET['symbol'])) {
    $symbolsParam = trim($_GET['symbol']);
}

if (empty($symbolsParam)) {
    echo json_encode(['error' => 'NO_SYMBOL', 'message' => 'ticker, tickers, or symbol parameter required']);
    exit;
}

// 콤마로 구분된 티커들을 배열로 변환
$symbols = array_filter(array_map('trim', explode(',', $symbolsParam)));

if (empty($symbols)) {
    echo json_encode(['error' => 'NO_SYMBOL', 'message' => 'No valid symbols provided']);
    exit;
}

// period1, period2 파라미터
$period1 = isset($_GET['period1']) ? intval($_GET['period1']) : (time() - 180 * 24 * 60 * 60);
$period2 = isset($_GET['period2']) ? intval($_GET['period2']) : time();

// User-Agent 풀 (더 다양하게)
$userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36'
];

// 쿠키 파일 경로 (세션 유지용)
$cookieFile = sys_get_temp_dir() . '/yahoo_cookies_' . md5($_SERVER['REMOTE_ADDR']) . '.txt';

/**
 * 단일 티커 데이터 가져오기
 */
function fetchTickerData($symbol, $period1, $period2, $userAgents, $cookieFile) {
    $url = "https://query1.finance.yahoo.com/v8/finance/chart/{$symbol}?period1={$period1}&period2={$period2}&interval=1d";
    $userAgent = $userAgents[array_rand($userAgents)];
    
    $ch = curl_init();
    
    if ($ch === false) {
        return ['symbol' => $symbol, 'error' => 'CURL_INIT_FAILED'];
    }
    
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_COOKIEFILE => $cookieFile,  // 쿠키 읽기
        CURLOPT_COOKIEJAR => $cookieFile,   // 쿠키 저장
        CURLOPT_HTTPHEADER => [
            "User-Agent: {$userAgent}",
            'Accept: application/json,text/html,application/xhtml+xml',
            'Accept-Language: en-US,en;q=0.9',
            'Accept-Encoding: gzip, deflate, br',
            'Connection: keep-alive',
            'Cache-Control: no-cache'
        ],
        CURLOPT_ENCODING => 'gzip, deflate, br'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($response === false) {
        return ['symbol' => $symbol, 'error' => 'CURL_FAILED', 'message' => $curlError];
    }
    
    if ($httpCode === 429) {
        return ['symbol' => $symbol, 'error' => 'API_RATE_LIMIT'];
    }
    
    if (strpos($response, '<!DOCTYPE') !== false || strpos($response, '<html') !== false) {
        return ['symbol' => $symbol, 'error' => 'API_BLOCKED'];
    }
    
    $data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return ['symbol' => $symbol, 'error' => 'JSON_PARSE_ERROR'];
    }
    
    return ['symbol' => $symbol, 'data' => $data, 'httpCode' => $httpCode];
}

/**
 * 랜덤 지연 (0.5~1초 사이) - 속도 우선
 */
function randomDelay() {
    $delayMs = rand(500, 1000); // 0.5초~1초
    usleep($delayMs * 1000);
}

// 단일 티커 요청 (기존 호환성 유지)
if (count($symbols) === 1) {
    $result = fetchTickerData($symbols[0], $period1, $period2, $userAgents, $cookieFile);
    
    if (isset($result['error'])) {
        $errorCode = $result['error'] === 'API_RATE_LIMIT' ? 429 : 
                    ($result['error'] === 'API_BLOCKED' ? 403 : 500);
        http_response_code($errorCode);
        echo json_encode(['error' => $result['error'], 'message' => $result['message'] ?? $result['error']]);
    } else {
        http_response_code($result['httpCode']);
        echo json_encode($result['data']);
    }
    exit;
}

// 배치 요청 (여러 티커)
$results = [];
$errors = [];

foreach ($symbols as $index => $symbol) {
    $result = fetchTickerData($symbol, $period1, $period2, $userAgents, $cookieFile);
    
    if (isset($result['error'])) {
        $errors[$symbol] = $result['error'];
    } else {
        $results[$symbol] = $result['data'];
    }
    
    // 마지막 요청이 아니면 랜덤 지연 (2~5초)
    if ($index < count($symbols) - 1) {
        randomDelay();
    }
}

// 배치 응답
echo json_encode([
    'batch' => true,
    'results' => $results,
    'errors' => $errors,
    'summary' => [
        'total' => count($symbols),
        'success' => count($results),
        'failed' => count($errors)
    ]
]);
