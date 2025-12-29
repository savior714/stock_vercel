# 📋 NAS Reverse Proxy 설정 가이드

## 🎯 목표
Yahoo Finance API 요청을 NAS를 통해 중계하여 Vercel IP 차단 문제 해결

---

## 1️⃣ PHP 스크립트 배포

### NAS에서 폴더 생성
```bash
# File Station에서 /web/yahoo-proxy 폴더 생성
```

### index.php 복사
프로젝트의 `docs/nas-proxy/index.php` 파일을 NAS의 `/web/yahoo-proxy/index.php`에 복사

---

## 2️⃣ Web Station 설정

### 기본 확인

1. **Web Station 앱 열기**
2. **스크립트 언어 설정** 탭에서 PHP 8.0 프로필이 활성화되어 있는지 확인
3. 기본 웹 서버가 `/web` 폴더를 서빙하면 자동으로 `/yahoo-proxy/` 경로가 활성화됨

### 500 에러가 발생하는 경우

**상세 가이드**: `docs/nas-proxy/WEB_STATION_SETUP.md` 참고

**빠른 확인:**
1. Web Station이 설치되어 있는지 확인
2. PHP 프로필이 생성되어 있는지 확인
3. PHP 프로필에 **cURL 확장**이 활성화되어 있는지 확인
4. 가상 호스트 설정 확인 (문서 루트: `/web`)
5. Web Station 재시작

---

## 3️⃣ DDNS 확인

현재 설정된 DDNS 주소 확인:
- 제어판 → 외부 액세스 → DDNS

**예시**: `savior714.synology.me`

---

## 4️⃣ 테스트 (NAS에서)

```bash
curl "http://localhost/yahoo-proxy/?ticker=AAPL&period1=1700000000&period2=1730000000"
```

성공하면 JSON 응답이 반환됨

**에러 응답 예시:**
- HTML 응답(차단) 감지 시: `{"error":"API_BLOCKED","message":"..."}`
- 429 Rate Limit: `{"error":"API_RATE_LIMIT","message":"..."}`

---

## 5️⃣ 환경 변수 설정

### Vercel 프로덕션 환경

Vercel 프로젝트 → Settings → Environment Variables:

```
NAS_PROXY_URL = http://savior714.synology.me/yahoo-proxy/
```

> ⚠️ 마지막에 `/` 포함해야 합니다!

### 로컬 개발 환경

프로젝트 루트에 `.env.local` 파일 생성:

```
NAS_PROXY_URL=http://savior714.synology.me/yahoo-proxy/
```

> ⚠️ 로컬에서는 `http://` 사용 가능하지만, Vercel에서는 HTTPS가 필요할 수 있습니다.

---

## 6️⃣ 배포 및 테스트

Vercel에서 재배포 후 앱 테스트
