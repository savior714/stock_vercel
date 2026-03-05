# Market Data and Stock Analysis Troubleshooting

### Abnormal Put/Call Ratio Display (e.g., 235606.32)

**Symptoms:**
The Put/Call Ratio in market indicators displays an abnormally high value like 235606.32. The normal range is 0.5 to 1.5.

**Cause:**
Scale transformation logic error for the CNN API's `put_call_options.data[].y` value:
- Previous Code: `(last.y * 100.0).round() / 100.0` (Rust)
- Previous Code: `Math.round(latestPC.y * 100) / 100` (TypeScript)
- The CNN API already provides values in the appropriate scale, but multiplying by 100 distorted the value.

**Resolution:**
Use the CNN API value directly with 4-decimal-place rounding precision:

**Rust (`src-tauri/src/lib.rs`):**
```rust
// Before
pc_ratio = (last.y * 100.0).round() / 100.0;

// After
pc_ratio = (last.y * 10000.0).round() / 10000.0;
```

**TypeScript (`app/api/market-indicators/route.ts`):**
```typescript
// Before
putCallRatio = Math.round(latestPC.y * 100) / 100;

// After
putCallRatio = Math.round(latestPC.y * 10000) / 10000;
```

**Rebuild Required:**
Tauri app rebuild is mandatory after modifying the Rust backend:
```powershell
npm run tauri:dev  # Development mode
# OR
npm run tauri:build  # Production build
```

**Verification:**
1. Launch the Tauri app.
2. Check the Put/Call Ratio value in the market indicators card.
3. Verify that the value is within the normal range (0.5 to 1.5).

---

### Analysis Completion Count Display Error (Shows Total Tickers)

**Symptoms:**
Upon completion, the "Total Analysis Completed" count reflects the total number of tickers including errors (e.g., 372).

**Cause:**
`app/page.tsx` used `results.length` as the source for the count regardless of error presence.

**Resolution:**
Filter the results array to count only items without errors:
```typescript
totalResultsCount={results.filter(r => !r.error).length}
```
