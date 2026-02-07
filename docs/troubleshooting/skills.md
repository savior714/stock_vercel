# Skills 서브모듈 및 에이전트 도구 트러블슈팅

### 서브모듈 업데이트 시 체크아웃 오류 (heads/main)

**증상:**
`git submodule update --remote --merge` 실행 시 원격 브랜치 참조 오류 또는 체크아웃 실패 발생.

**원인:**
로컬 서브모듈의 HEAD 상태가 원격과 어긋나거나, 머지 충돌이 잠복해 있는 경우 발생.

**해결 방법:**
서브모듈 디렉토리로 이동하여 강제로 원격 브랜치에 맞게 리셋:
```powershell
cd .agent/skills
git fetch origin
git reset --hard origin/main
cd ../..
```
이후 `git submodule status`를 통해 커밋 해시가 업데이트되었는지 확인합니다.
