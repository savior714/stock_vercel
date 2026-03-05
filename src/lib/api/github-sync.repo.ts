import { isTauriEnvironment } from '@/lib/utils/platform';

export interface SyncResult {
    success: boolean;
    error?: string;
}

/**
 * Repository for handling GitHub Preset Synchronization
 * Adheres to DDD Repository Layer (Native/Tauri implementation)
 */
export const GithubSyncRepo = {
    /**
     * Pull, Write, and Push presets to GitHub
     * Uses PowerShell 7 (pwsh) for Windows 11 Compatibility
     */
    async syncPresets(tickers: string[]): Promise<SyncResult> {
        if (!isTauriEnvironment()) {
            return { success: false, error: 'Tauri environment required for GitHub sync' };
        }

        try {
            const { Command } = await import('@tauri-apps/plugin-shell');
            const jsonContent = JSON.stringify(tickers);
            const escapedJson = jsonContent.replace(/'/g, "''");

            // 1. Pull First (Rebase)
            // Using 'pwsh' for PowerShell 7 as per Global Rules
            const pullCmd = Command.create('pwsh', [
                '-NoProfile',
                '-Command',
                'git -C .. pull origin main --rebase'
            ]);
            const pullResult = await pullCmd.execute();

            if (pullResult.code !== 0) {
                const errorMsg = pullResult.stderr || pullResult.stdout;
                if (errorMsg.includes('auth') || errorMsg.includes('permission')) {
                    return { success: false, error: 'GitHub Authentication Failed' };
                } else if (errorMsg.includes('conflict')) {
                    return { success: false, error: 'Sync Conflict Detected (Manual resolution required)' };
                }
                return { success: false, error: `Git Pull Failed: ${errorMsg}` };
            }

            // 2. Write file with UTF8 No BOM
            const writeCmd = Command.create('pwsh', [
                '-NoProfile',
                '-Command',
                `$utf8NoBom = [System.Text.UTF8Encoding]::new($false); [System.IO.File]::WriteAllText('../presets.json', '${escapedJson}', $utf8NoBom)`
            ]);
            const writeResult = await writeCmd.execute();
            if (writeResult.code !== 0) {
                return { success: false, error: `File Writing Failed: ${writeResult.stderr}` };
            }

            // 3. Commit & Push
            const pushCmd = Command.create('pwsh', [
                '-NoProfile',
                '-Command',
                'git -C .. add presets.json; git -C .. commit -m "update: stock presets sync"; git -C .. push origin main'
            ]);

            const pushResult = await pushCmd.execute();
            if (pushResult.code !== 0) {
                return { success: false, error: `GitHub Push Failed: ${pushResult.stderr}` };
            }

            return { success: true };

        } catch (e) {
            console.error('GithubSyncRepo Error:', e);
            return { success: false, error: e instanceof Error ? e.message : 'Unknown sync error' };
        }
    }
};
