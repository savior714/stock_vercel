# 🐛 NAS 프록시 디버깅 가이드

## 500 Internal Server Error 해결

### 1️⃣ PHP 에러 로그 확인

NAS에서 PHP 에러 로그 확인:

```bash
# SSH 접속 후
tail -f /var/log/php-fpm/error.log
# 또는
tail -f /var/log/nginx/error.log
```

---

### 2️⃣ cURL 확장 확인

PHP에서 cURL이 활성화되어 있는지 확인:

**방법 A: SSH에서 확인**
```bash
php -m | grep curl
```

**방법 B: PHP 파일 생성**
`/web/test-curl.php` 파일 생성:
```php
<?php
if (function_exists('curl_init')) {
    echo "cURL is available";
} else {
    echo "cURL is NOT available";
}
phpinfo();
?>
```

브라우저에서 `http://YOUR_DDNS/test-curl.php` 접속

---

### 3️⃣ PHP 버전 확인

```bash
php -v
```

PHP 7.4 이상 필요 (PHP 8.0 권장)

---

### 4️⃣ 파일 권한 확인

```bash
ls -la /web/yahoo-proxy/index.php
```

권한이 `644` 또는 `755`여야 함:
```bash
chmod 644 /web/yahoo-proxy/index.php
```

---

### 5️⃣ 간단한 테스트 파일 생성

`/web/yahoo-proxy/test.php` 생성:
```php
<?php
header('Content-Type: application/json');
echo json_encode(['status' => 'ok', 'php_version' => phpversion()]);
?>
```

브라우저에서 접속하여 JSON이 반환되는지 확인

---

### 6️⃣ 단계별 디버깅

`index.php` 파일을 단계별로 테스트:

**Step 1: 기본 동작 확인**
```php
<?php
header('Content-Type: application/json');
echo json_encode(['test' => 'ok']);
?>
```

**Step 2: GET 파라미터 확인**
```php
<?php
header('Content-Type: application/json');
echo json_encode([
    'ticker' => $_GET['ticker'] ?? 'not set',
    'period1' => $_GET['period1'] ?? 'not set',
    'period2' => $_GET['period2'] ?? 'not set'
]);
?>
```

**Step 3: cURL 테스트**
```php
<?php
header('Content-Type: application/json');
if (!function_exists('curl_init')) {
    echo json_encode(['error' => 'curl not available']);
    exit;
}

$ch = curl_init('https://httpbin.org/get');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

echo json_encode(['response' => $response]);
?>
```

---

### 7️⃣ Web Station PHP 프로필 확인

1. Web Station → 스크립트 언어 설정
2. PHP 프로필 확인:
   - PHP 8.0 또는 PHP 7.4 선택
   - cURL 확장 활성화 확인

---

### 8️⃣ 일반적인 해결 방법

#### 방법 A: PHP 프로필 재설정
1. Web Station → 스크립트 언어 설정
2. PHP 프로필 삭제 후 재생성
3. cURL 확장 활성화

#### 방법 B: 파일 재업로드
1. `index.php` 파일 삭제
2. 새로 업로드
3. 권한 확인: `chmod 644 index.php`

#### 방법 C: Web Station 재시작
1. Web Station → 중지
2. 잠시 대기
3. 다시 시작

---

## 🔍 에러 메시지별 해결

### "cURL extension is not available"
- **원인**: PHP cURL 확장 미설치
- **해결**: Web Station에서 PHP 프로필에 cURL 확장 추가

### "Failed to initialize cURL"
- **원인**: cURL 초기화 실패
- **해결**: PHP 재시작 또는 Web Station 재시작

### "No response from Yahoo Finance API"
- **원인**: Yahoo Finance API 접근 불가
- **해결**: 네트워크 연결 확인, 방화벽 설정 확인

---

## 📝 체크리스트

- [ ] PHP 버전 7.4 이상
- [ ] cURL 확장 활성화됨
- [ ] 파일 권한 올바름 (644 또는 755)
- [ ] Web Station PHP 프로필 설정 확인
- [ ] 에러 로그 확인 완료
- [ ] 테스트 파일로 단계별 확인 완료

