const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Use process.cwd() to resolve from project root if possible, or relative to script
const projectRoot = path.resolve(__dirname, '..');
const appDir = path.join(projectRoot, 'app');
const apiDir = path.join(appDir, 'api');
const apiHiddenDir = path.join(projectRoot, 'api_backup');

console.log('--- Build Static Script ---');
console.log('Project Root:', projectRoot);
console.log('App Dir:', appDir);

// 1. Recovery: If api_backup exists but api doesn't, restore it first
if (fs.existsSync(apiHiddenDir) && !fs.existsSync(apiDir)) {
    console.log('Found orphaned api_backup. Restoring to app/api before starting...');
    try {
        fs.renameSync(apiHiddenDir, apiDir);
    } catch (err) {
        console.error('CRITICAL: Failed to recover app/api:', err);
        process.exit(1);
    }
}

// 2. Rename api -> api_backup
let didRename = false;
if (fs.existsSync(apiDir)) {
    console.log('Moving app/api -> api_backup'); // Hide API for static export
    try {
        fs.renameSync(apiDir, apiHiddenDir);
        didRename = true;
    } catch (err) {
        console.error('Failed to move app/api:', err);
        process.exit(1);
    }
} else {
    console.log('Warning: app/api not found. Assuming already hidden or missing.');
}

const restoreApi = () => {
    if (didRename && fs.existsSync(apiHiddenDir)) {
        console.log('Restoring api_backup -> app/api');
        try {
            fs.renameSync(apiHiddenDir, apiDir);
            didRename = false;
        } catch (err) {
            console.error('CRITICAL: Failed to restore app/api:', err);
        }
    }
};

// Ensure cleanup on exit
process.on('SIGINT', () => {
    console.log('Received SIGINT. Cleaning up...');
    restoreApi();
    process.exit();
});

// Note: 'exit' event cannot perform async work, but renameSync is sync so it's fine.
process.on('exit', () => {
    restoreApi();
});

try {
    console.log('Cleaning .next and out directories...');
    const nextDir = path.join(projectRoot, '.next');
    const outDir = path.join(projectRoot, 'out');
    if (fs.existsSync(nextDir)) fs.rmSync(nextDir, { recursive: true, force: true });
    if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });

    console.log('Running Next.js build...');
    // Use npm run build (which calls "next build") but with TAURI_ENV set
    // This ensures we use the project's next version and configuration
    execSync('set TAURI_ENV=true&& npm run build', {
        stdio: 'inherit',
        shell: true,
        cwd: projectRoot
    });
    console.log('Build completed successfully.');
} catch (error) {
    console.error('Build failed!');
    process.exit(1);
} finally {
    restoreApi();
}
