# 🛠 Troubleshooting Guide

이 문서는 Stock Analysis Dashboard 개발 및 사용 중 발생할 수 있는 문제와 해결 방법을 주제별로 정리한 인덱스입니다.

## 📂 주제별 트러블슈팅 가이드

| 주제 | 문서 링크 | 설명 |
| :--- | :--- | :--- |
| **💻 Terminal** | [terminal.md](./troubleshooting/terminal.md) | PowerShell 출력 잘림, Git 인코딩 등 |
| **🏠 Desktop (Tauri)** | [tauri.md](./troubleshooting/tauri.md) | Tauri v2 환경 감지, 프리셋 로딩, 권한 설정 등 |
| **📱 Mobile (Android)** | [android.md](./troubleshooting/android.md) | Capacitor 빌드 에러, AGP 버전 이슈, 경로 체크 우회 등 |
| **🎨 GUI & Style** | [gui.md](./troubleshooting/gui.md) | 모달 드래그 닫힘 현상, UI 인터랙션 버그 등 |
| **🏗 Build & Deploy** | [build.md](./troubleshooting/build.md) | 정적 export 설정, 빌드 캐시 초기화, Vercel 배포 등 |
| **📊 Analysis & Data** | [analysis.md](./troubleshooting/analysis.md) | Put/Call Ratio 스케일 오류, 분석 카운트 집계 로직 등 |
| **🔐 Permissions** | [permissions.md](./troubleshooting/permissions.md) | Tauri v2 Capabilities 설정 및 파일 접근 권한 |
| **🛠 Skills & Agents** | [skills.md](./troubleshooting/skills.md) | Skills 서브모듈 동기화 및 에이전트 도구 활용 오류 |
| **🧹 Refactoring** | [refactoring.md](./troubleshooting/refactoring.md) | 타입 리팩토링 중 발생한 매칭 에러 및 로직 복구 등 |

---

## 💡 수동 업데이트 규칙
- 신규 트러블슈팅 사례 발생 시, 적절한 하위 문서를 찾아 추가합니다.
- 새로운 카테고리가 필요할 경우 `docs/troubleshooting/`에 새 파일을 생성하고 이 인덱스에 링크를 추가합니다.
