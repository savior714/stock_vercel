<?php
/**
 * Yahoo Finance Proxy for Synology NAS
 * NAS의 IP를 사용하여 Yahoo Finance API 요청을 중계합니다.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS 요청 처리 (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// API 키 인증 (선택적 - 보안 강화 시 활성화)
// $apiKey = $_GET['key'] ?? '';
// if ($apiKey !== 'YOUR_SECRET_KEY') {
//     http_response_code(403);
//     echo json_encode(['error' => 'Unauthorized']);
//     exit;
// }

// 파라미터 확인
$ticker = $_GET['ticker'] ?? '';
$period1 = $_GET['period1'] ?? '';
$period2 = $_GET['period2'] ?? '';

if (!$ticker || !$period1 || !$period2) {
    http_response_code(400);
    echo json_encode(['error' => 'ticker, period1, period2 required']);
    exit;
}

// Yahoo Finance API URL 생성
$url = "https://query1.finance.yahoo.com/v8/finance/chart/" . urlencode($ticker) 
     . "?period1=" . urlencode($period1) 
     . "&period2=" . urlencode($period2) 
     . "&interval=1d";

// User-Agent 목록 (랜덤 선택)
$userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
];
$userAgent = $userAgents[array_rand($userAgents)];

// cURL 요청
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Accept-Language: en-US,en;q=0.9'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// 에러 처리
if ($error) {
    http_response_code(500);
    echo json_encode(['error' => 'Proxy error: ' . $error]);
    exit;
}

// HTTP 상태 코드 전달
http_response_code($httpCode);
echo $response;
?>
