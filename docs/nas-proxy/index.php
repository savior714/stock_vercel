<?php
/**
 * Yahoo Finance API Proxy for Synology NAS
 * ticker 또는 symbol 파라미터 모두 지원
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ticker 또는 symbol 파라미터 지원
$symbol = '';
if (isset($_GET['ticker']) && !empty($_GET['ticker'])) {
    $symbol = trim($_GET['ticker']);
} elseif (isset($_GET['symbol']) && !empty($_GET['symbol'])) {
    $symbol = trim($_GET['symbol']);
}

if (empty($symbol)) {
    echo json_encode(['error' => 'NO_SYMBOL', 'message' => 'ticker or symbol parameter required']);
    exit;
}

// period1, period2 파라미터 지원 (없으면 기본값 사용)
$period1 = isset($_GET['period1']) ? intval($_GET['period1']) : (time() - 180 * 24 * 60 * 60);
$period2 = isset($_GET['period2']) ? intval($_GET['period2']) : time();

// Yahoo Finance API URL
$url = "https://query1.finance.yahoo.com/v8/finance/chart/{$symbol}?period1={$period1}&period2={$period2}&interval=1d";

// cURL 초기화
$ch = curl_init();

if ($ch === false) {
    echo json_encode(['error' => 'CURL_INIT_FAILED', 'message' => 'cURL initialization failed']);
    exit;
}

// User-Agent 랜덤 선택
$userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
];
$userAgent = $userAgents[array_rand($userAgents)];

curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 3,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_HTTPHEADER => [
        "User-Agent: {$userAgent}",
        'Accept: application/json',
        'Accept-Language: en-US,en;q=0.9'
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// cURL 에러
if ($response === false) {
    echo json_encode(['error' => 'CURL_FAILED', 'message' => $curlError]);
    exit;
}

// 429 Rate Limit
if ($httpCode === 429) {
    http_response_code(429);
    echo json_encode(['error' => 'API_RATE_LIMIT', 'message' => 'Too many requests to Yahoo Finance']);
    exit;
}

// HTML 응답 감지 (차단됨)
if (strpos($response, '<!DOCTYPE') !== false || strpos($response, '<html') !== false) {
    http_response_code(403);
    echo json_encode(['error' => 'API_BLOCKED', 'message' => 'Yahoo Finance returned HTML (blocked or CAPTCHA)']);
    exit;
}

// 정상 응답
http_response_code($httpCode);
echo $response;
