# 권한 및 보안 관련 트러블슈팅

### Tauri v2 파일 시스템 권한

Tauri v2는 보안을 위해 기본적으로 파일 시스템 접근을 제한합니다.

**필요한 권한:**
- `fs:allow-app-read-recursive`: 앱 데이터 디렉토리 읽기
- `fs:allow-app-write-recursive`: 앱 데이터 디렉토리 쓰기
- `$APPLOCALDATA` 경로 명시

**설정 위치:**
`src-tauri/capabilities/default.json`
