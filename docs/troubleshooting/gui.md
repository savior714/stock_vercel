# UI/UX and Style Troubleshooting

### Settings Modal Closes Unexpectedly During Drag

**Symptoms:**
The settings modal closes when attempting to drag and select input values (e.g., numbers) if the mouse cursor leaves the modal area and the click is released.

**Cause:**
Standard `onClick` handlers fire on `mouseup`. Dragging after a `mousedown` inside the modal and releasing outside may be interpreted by the browser as an overlay (background) click. Relying solely on `e.target === e.currentTarget` cannot distinguish where the `mousedown` originated.

**Resolution:**
Combine `onMouseDown` and `onMouseUp` events to ensure the modal only closes when **both the start and end of the click originate on the overlay (background)**:

```typescript
// Allow closing only if mousedown started on the overlay
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

---

### Overlay Mode & Click-Through Implementation (2026-02-08)

**Goal**: The app should become transparent and pass mouse clicks to the window behind when it loses focus (Blur).

**Issues**:
1. If `decorations: true`, Windows OS forces the background to be opaque.
2. Simple CSS `opacity` adjustment cannot pass through mouse events.

**Resolution**:
1. `tauri.conf.json`: Set `decorations: false` and `shadow: false` (Required).
2. **Custom TitleBar**: Implement a custom titlebar to restore window movement/close functionality.
3. **Rust Backend**: Implement the `set_ignore_cursor_events(true)` command.
4. **Frontend Logic**: Call `set_ignore_cursor_events(true)` and lower CSS opacity on `window.onblur`. Reverse the process on `window.onfocus`.
