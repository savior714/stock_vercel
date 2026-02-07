# UI/UX 및 스타일 관련 트러블슈팅

### 설정 모달이 드래그 시 닫히는 문제

**증상:**
설정창 내부의 입력값(숫자 등)을 드래그해서 선택하려다가 마우스 커서가 모달 밖으로 나간 상태에서 클릭을 떼면 모달이 닫혀버림.

**원인:**
기존 `onClick` 핸들러는 `mouseup` 시점에 발생하는데, 드래그 동작 후 밖에서 떼면 브라우저가 이를 오버레이(배경) 클릭으로 인식할 수 있음. 단순 `e.target === e.currentTarget` 체크만으로는 `mousedown` 위치를 구별하지 못함.

**해결 방법:**
`onClick` 대신 `onMouseDown`과 `onMouseUp` 이벤트를 조합하여, **클릭의 시작과 끝이 모두 오버레이(배경)일 때**만 닫히도록 수정:

```typescript
// mousedown이 오버레이에서 시작되었을 때만 닫기 허용
const [isOverlayMouseDown, setIsOverlayMouseDown] = useState(false);

const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setIsOverlayMouseDown(true);
    else setIsOverlayMouseDown(false);
};

const handleOverlayMouseUp = (e: React.MouseEvent) => {
    if (isOverlayMouseDown && e.target === e.currentTarget) {
        onClose();
    }
    setIsOverlayMouseDown(false);
};

return (
    <div 
        className="modal-overlay" 
        onMouseDown={handleOverlayMouseDown}
        onMouseUp={handleOverlayMouseUp}
    >
    ...
```

### 3. Overlay Mode & Click-Through Implementation (2026-02-08)
- **목표**: 앱이 포커스를 잃으면(Blur) 투명해지고 마우스 클릭이 뒤쪽 창으로 전달되어야 함.
- **문제**:
  1. `decorations: true`일 경우 윈도우 OS가 강제로 배경을 불투명하게 만듬.
  2. 단순 CSS 투명도 조절(`opacity`)만으로는 마우스 이벤트를 통과시킬 수 없음.
- **해결**:
  1. `tauri.conf.json`: `decorations: false`, `shadow: false` 설정 (필수).
  2. **Custom TitleBar**: 시스템 타이틀바 대신 직접 구현하여 창 이동/종료 기능 복구.
  3. **Rust Backend**: `set_ignore_cursor_events(true)` 커맨드를 구현.
  4. **Frontend Logic**: `window.onblur` 시 `set_ignore_cursor_events(true)` 호출 + CSS 투명도 낮춤. `window.onfocus` 시 반대로 복구.
