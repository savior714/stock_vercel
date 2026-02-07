# 시장 데이터 및 주가 분석 트러블슈팅

### Put/Call Ratio 비정상 표시 (235606.32)

**증상:**
시장 지표에서 Put/Call Ratio가 235606.32처럼 비정상적으로 높은 값으로 표시됨. 정상 범위는 0.5~1.5.

**원인:**
CNN API의 `put_call_options.data[].y` 값에 대한 스케일 변환 로직 오류:
- 기존 코드: `(last.y * 100.0).round() / 100.0` (Rust)
- 기존 코드: `Math.round(latestPC.y * 100) / 100` (TypeScript)
- CNN API가 이미 적절한 스케일로 값을 제공하는데, 추가로 100을 곱하여 값이 왜곡됨

**해결 방법:**
반올림 정밀도를 소수점 4자리로 변경하여 CNN API 값을 그대로 사용:

**Rust (`src-tauri/src/lib.rs`):**
```rust
// 수정 전
pc_ratio = (last.y * 100.0).round() / 100.0;

// 수정 후
pc_ratio = (last.y * 10000.0).round() / 10000.0;
```

**TypeScript (`app/api/market-indicators/route.ts`):**
```typescript
// 수정 전
putCallRatio = Math.round(latestPC.y * 100) / 100;

// 수정 후
putCallRatio = Math.round(latestPC.y * 10000) / 10000;
```

**재빌드 필요:**
Rust 백엔드 수정 시 반드시 Tauri 앱 재빌드 필요:
```powershell
npm run tauri:dev  # 개발 모드
# 또는
npm run tauri:build  # 프로덕션 빌드
```

**검증 방법:**
1. Tauri 앱 실행
2. 시장 지표 카드에서 Put/Call Ratio 값 확인
3. 정상 범위(0.5~1.5) 내 값이 표시되는지 확인

### 분석 완료 카운트 표시 오류 (전체 티커 수 표시)

**증상:**
분석이 완료되었을 때 "전체 분석 완료" 카운트가 에러를 포함한 전체 티커 수(예: 372개)로 표시됨.

**원인:**
`app/page.tsx`에서 에러 여부와 관계없이 `results.length`를 카운트의 원본 데이터로 사용함.

**해결 방법:**
결과 배열에서 에러가 없는 항목만 필터링하여 카운트하도록 수정:
```typescript
totalResultsCount={results.filter(r => !r.error).length}
```
