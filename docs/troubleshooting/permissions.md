# Permissions and Security Troubleshooting

### Tauri v2 File System Permissions

By default, Tauri v2 restricts file system access for enhanced security.

**Required Permissions:**
- `fs:allow-app-read-recursive`: Allows reading directly from the app's data directory.
- `fs:allow-app-write-recursive`: Allows writing directly to the app's data directory.
- Explicit specification of the `$APPLOCALDATA` path.

**Configuration File Location:**
`src-tauri/capabilities/default.json`
