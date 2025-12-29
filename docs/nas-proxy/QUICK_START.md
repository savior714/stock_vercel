# 🚀 NAS 프록시 빠른 설정 가이드

## 📋 사전 준비사항

- Synology NAS 접근 권한
- Web Station 설치 및 활성화
- PHP 8.0 이상 활성화
- DDNS 설정 완료 (예: `savior714.synology.me`)

---

## ⚡ 빠른 설정 (5단계)

### 1단계: NAS에 폴더 생성

1. **File Station** 열기
2. `/web` 폴더로 이동
3. 새 폴더 생성: `yahoo-proxy`

**경로**: `/web/yahoo-proxy/`

---

### 2단계: PHP 파일 업로드

1. 프로젝트의 `docs/nas-proxy/index.php` 파일 복사
2. File Station에서 `/web/yahoo-proxy/` 폴더로 업로드
3. 파일명 확인: `index.php`

**최종 경로**: `/web/yahoo-proxy/index.php`

---

### 3단계: Web Station 확인

1. **Web Station** 앱 열기
2. **스크립트 언어 설정** 탭 확인
3. **PHP 8.0** 프로필이 활성화되어 있는지 확인
   - 없으면 PHP 8.0 설치 필요

---

### 4단계: DDNS 주소 확인

1. **제어판** → **외부 액세스** → **DDNS**
2. 현재 설정된 DDNS 주소 확인
   - 예: `savior714.synology.me`
3. 주소 기록해두기 (다음 단계에서 사용)

---

### 5단계: 로컬 테스트

NAS의 SSH 또는 터미널에서:

```bash
curl "http://localhost/yahoo-proxy/?ticker=AAPL&period1=1700000000&period2=1730000000"
```

**성공 시**: JSON 데이터 반환
**실패 시**: 에러 메시지 확인

---

## ✅ 다음 단계: Vercel 환경 변수 설정

NAS 프록시가 정상 작동하면:

1. **Vercel 대시보드** 접속
2. 프로젝트 선택 → **Settings** → **Environment Variables**
3. 새 변수 추가:
   - **Key**: `NAS_PROXY_URL`
   - **Value**: `http://savior714.synology.me/yahoo-proxy/`
   - ⚠️ 마지막에 `/` 반드시 포함!
4. **Save** 클릭
5. **재배포** 실행

---

## 🔍 문제 해결

### 문제 1: 404 Not Found
- **원인**: 폴더 경로 또는 파일명 오류
- **해결**: `/web/yahoo-proxy/index.php` 경로 확인

### 문제 2: 500 Internal Server Error
- **원인**: PHP 설정 문제 또는 cURL 미설정
- **해결**: Web Station에서 PHP 8.0 프로필 확인, cURL 확장 활성화 확인

### 문제 3: 외부에서 접근 불가
- **원인**: 방화벽 또는 DDNS 설정 문제
- **해결**: 
  - 제어판 → 보안 → 방화벽에서 포트 80/443 허용 확인
  - DDNS 설정 확인

### 문제 4: HTTPS 필요
- **원인**: Vercel에서 HTTPS만 허용
- **해결**: 
  - Synology에서 Let's Encrypt 인증서 설정
  - 또는 Reverse Proxy 설정으로 HTTPS 제공
  - 환경 변수에 `https://` 사용

---

## 📞 추가 도움

문제가 계속되면:
1. NAS 로그 확인: `/var/log/nginx/error.log`
2. PHP 로그 확인: Web Station → 로그
3. 브라우저에서 직접 접속 테스트: `http://savior714.synology.me/yahoo-proxy/?ticker=AAPL&period1=1700000000&period2=1730000000`

