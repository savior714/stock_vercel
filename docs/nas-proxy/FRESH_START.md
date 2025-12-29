# 🔄 시놀로지 NAS 프록시 - 처음부터 다시 설정

## 📋 사전 준비

### 필요한 것
- Synology NAS (DSM 7.x)
- 관리자 계정 접속
- Web Station 패키지

---

## 🧹 1단계: 기존 설정 정리

### 1.1 SSH로 Nginx 복구 (연결이 끊어진 경우)

```bash
# SSH 접속
ssh your-nas-address

# Nginx 설정 복원 (이전에 변경한 경우)
cd /etc/nginx/sites-enabled
sudo mv .location.webstation.conf.backup .location.webstation.conf 2>/dev/null

# 추가한 설정 파일 삭제
sudo rm -f /etc/nginx/conf.d/zzz-php-fix.conf 2>/dev/null
sudo rm -f /etc/nginx/conf.d/php-fix.conf 2>/dev/null

# Nginx 재시작
sudo synoservice --restart nginx
```

### 1.2 Web Station에서 기존 가상 호스트 삭제

1. **DSM** → **Web Station** 열기
2. **웹 서비스 포털** 탭
3. 기존 yahoo-proxy 관련 항목 **삭제**

---

## 🆕 2단계: 새로운 방식으로 설정

### 방법 A: 기본 웹 폴더 사용 (가장 간단)

Web Station의 기본 웹 폴더(`/web`)를 사용하면 가상 호스트 설정 없이 PHP가 작동합니다.

#### 2.1 PHP 프로파일 생성

1. **Web Station** → **스크립트 언어 설정** 탭
2. **생성** 클릭
3. 설정:
   - **이름**: `php80-proxy`
   - **스크립트 언어**: PHP 8.0
   - **확장 모듈**: `curl` ✅ 체크 (필수!)
   - **PHP 캐시**: 활성화
4. **저장**

#### 2.2 기본 웹 서비스 설정

1. **Web Station** → **웹 서비스 포털** 탭
2. **기본 서버 포털** 선택 → **편집**
3. 설정:
   - **HTTP 백엔드 서버**: Apache 2.4 (권장) 또는 Nginx
   - **PHP**: `php80-proxy` 선택
4. **저장**

#### 2.3 프록시 파일 업로드

File Station에서 `/web/yahoo-proxy/` 폴더 생성 후 `index.php` 업로드

---

### 방법 B: Apache 백엔드 사용 (PHP 처리 더 안정적)

Nginx 대신 Apache를 사용하면 PHP 처리가 더 간단합니다.

#### 2.1 PHP 프로파일 생성 (위와 동일)

#### 2.2 웹 서비스 포털 생성

1. **Web Station** → **웹 서비스 포털** 탭
2. **생성** → **서비스 포털 생성**
3. **포트 기반** 선택
4. 설정:
   - **포트**: 8080 (또는 원하는 포트)
   - **HTTP 백엔드 서버**: **Apache 2.4** ⭐
   - **문서 루트**: `/web/yahoo-proxy`
   - **PHP**: `php80-proxy` 선택
5. **저장**

---

## 📄 3단계: 프록시 PHP 파일 작성

### 3.1 가장 간단한 버전 먼저 테스트

`/web/yahoo-proxy/test.php` 파일 생성:

```php
<?php
// 기본 PHP 동작 테스트
header('Content-Type: application/json');
echo json_encode([
    'status' => 'ok',
    'php_version' => PHP_VERSION,
    'curl_enabled' => function_exists('curl_init'),
    'timestamp' => date('Y-m-d H:i:s')
]);
```

### 3.2 브라우저에서 테스트

**방법 A 사용 시**: `http://your-nas:5000/yahoo-proxy/test.php`
**방법 B 사용 시**: `http://your-nas:8080/test.php`

### 3.3 예상 결과

```json
{
    "status": "ok",
    "php_version": "8.0.x",
    "curl_enabled": true,
    "timestamp": "2024-12-30 12:00:00"
}
```

---

## 🔧 4단계: 실제 프록시 코드 배포

`test.php`가 정상 작동하면 `index.php` 업로드:

```php
<?php
/**
 * Yahoo Finance API 프록시
 * 시놀로지 NAS용 - 최소화 버전
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS 요청 처리
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 심볼 파라미터 확인
$symbol = isset($_GET['symbol']) ? trim($_GET['symbol']) : '';

if (empty($symbol)) {
    echo json_encode(['error' => 'NO_SYMBOL', 'message' => 'symbol parameter required']);
    exit;
}

// Yahoo Finance API URL
$url = "https://query1.finance.yahoo.com/v8/finance/chart/{$symbol}?interval=1d&range=3mo&includePrePost=false";

// cURL 초기화
$ch = curl_init();

if ($ch === false) {
    echo json_encode(['error' => 'CURL_INIT_FAILED']);
    exit;
}

// cURL 옵션 설정
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 3,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_HTTPHEADER => [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept: application/json',
        'Accept-Language: en-US,en;q=0.9'
    ]
]);

// 요청 실행
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

curl_close($ch);

// 에러 처리
if ($response === false) {
    echo json_encode(['error' => 'CURL_ERROR', 'message' => $error]);
    exit;
}

// 429 Rate Limit
if ($httpCode === 429) {
    http_response_code(429);
    echo json_encode(['error' => 'API_RATE_LIMIT', 'message' => 'Too many requests']);
    exit;
}

// HTML 응답 감지 (차단됨)
if (strpos($response, '<!DOCTYPE') !== false || strpos($response, '<html') !== false) {
    http_response_code(403);
    echo json_encode(['error' => 'API_BLOCKED', 'message' => 'Request blocked by Yahoo']);
    exit;
}

// 정상 응답
http_response_code($httpCode);
echo $response;
```

---

## ✅ 5단계: 최종 테스트

### 5.1 프록시 직접 테스트

```
http://your-nas:8080/index.php?symbol=AAPL
```

또는 (방법 A 사용 시):

```
http://your-nas:5000/yahoo-proxy/index.php?symbol=AAPL
```

### 5.2 프로젝트에 환경변수 설정

`.env.local` 파일:

```env
NAS_PROXY_URL=http://your-nas:8080/index.php
```

---

## ❓ 문제 해결

### PHP가 다운로드됨 (코드가 보임)
→ PHP 프로파일이 연결되지 않음. Web Station에서 PHP 설정 확인

### 500 에러
→ PHP 오류. NAS에서 `/var/log/` 확인 또는 `test.php`로 기본 테스트

### 연결 거부
→ 포트가 열리지 않음. 방화벽 또는 Web Station 포털 설정 확인

### curl_init 없음
→ PHP 프로파일에서 curl 확장 활성화 필요

---

## 🎯 권장 설정 요약

| 항목 | 권장값 |
|------|--------|
| 백엔드 서버 | **Apache 2.4** |
| PHP 버전 | 8.0 이상 |
| PHP 확장 | curl ✅ |
| 포트 | 8080 |
| 문서 루트 | /web/yahoo-proxy |

