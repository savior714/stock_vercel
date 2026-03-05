# Build and Deployment Troubleshooting

### `out` Folder Not Generated

**Symptoms:**
- Error when running `npm run tauri:build`
- `frontendDist` path not found

**Cause:**
`next.config.ts` might be conditionally activating `output: 'export'`. Without environment variables, static export fails during build.

**Resolution 1: Set Environment Variable**
```powershell
$env:TAURI_ENV='true'; npm run build
```

**Resolution 2: Always Enable Static Export (Recommended)**
Modify `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  // Always use static export (Tauri/Capacitor compatibility)
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};
```

---

### Build Cache Issues

**Symptoms:**
- Modified code changes are not reflected
- Previous version of the app continues to run
- Removed debug code still triggers popups

**Cause:**
- Previous build outputs are cached in the `out` folder
- Previous Rust build outputs are cached in `src-tauri/target/release`

**Resolution:**
Perform a clean build:

```powershell
# 1. Delete frontend cache
Remove-Item -Recurse -Force out -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# 2. Delete Tauri cache (Optional, as it significantly increases build time)
Remove-Item -Recurse -Force src-tauri\target\release -ErrorAction SilentlyContinue

# 3. Rebuild
npm run build
npx tauri build
```

**Quick Fix (Frontend Only):**
```powershell
# Delete only the out folder and rebuild
Remove-Item -Recurse -Force out
npm run build
npx tauri build
```

---

### `beforeBuildCommand` Failure

**Symptoms:**
`npm run tauri:build` fails during the `beforeBuildCommand` stage.

**Cause:**
- Attempting static export while API routes are included
- Errors in the build script

**Resolution:**
Ensure the project can successfully run `npm run build` independently before executing `npx tauri build`.

---

### `Module not found: @tauri-apps/plugin-fs` (Post-dependency Optimization)

**Symptoms:**
- `@tauri-apps/plugin-fs` or `@tauri-apps/plugin-shell` modules not found error during `npm run lint` or `npm run build`
- Packages exist in `node_modules` but are not recognized

**Cause:**
- Lockfile (`package-lock.json`) mismatch or cache issues
- Dependency tree issues during move between `devDependencies` and `dependencies`
- Incomplete installation due to file locking in Windows environments

**Attempted Resolutions:**
1. **Clean Installation (Most Reliable):**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item -Force package-lock.json
   npm install
   ```
2. **Forced Reinstallation:**
   ```powershell
   npm install --force
   ```
3. **Verify TypeScript Configuration:**
   Ensure `moduleResolution` in `tsconfig.json` is set to `bundler` or `node`.

---

### `Code generation for chunk item errored` (JSON BOM Issue)

**Symptoms:**
- `SyntaxError: Unexpected token` or `JSON parse error` during `npm run build`
- Errors when importing specific JSON files (e.g., `presets.json`)

**Cause:**
- Generating JSON via `>` redirection in Windows PowerShell may include UTF-16 LE BOM
- Webpack/Turbopack cannot correctly parse JSON containing a BOM

**Resolution:**
1. **Remove BOM via Node.js Script:**
   ```javascript
   // fix_bom.js
   const fs = require('fs');
   const content = fs.readFileSync('presets.json');
   if (content[0] === 0xEF && content[1] === 0xBB && content[2] === 0xBF) {
       fs.writeFileSync('presets.json', content.slice(3));
   }
   ```
2. **Explicitly Specify PowerShell Encoding:**
   ```powershell
   [System.IO.File]::WriteAllText('presets.json', '[]', [System.Text.UTF8Encoding]::new($false))
   ```
