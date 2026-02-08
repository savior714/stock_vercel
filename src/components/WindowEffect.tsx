"use client";

import { useEffect } from "react";
import { isTauriEnvironment } from "@/lib/utils/platform";

export function WindowEffect() {
    useEffect(() => {
        // Only run in Tauri environment
        if (!isTauriEnvironment()) return;

        let unlistenBlur: (() => void) | undefined;
        let unlistenFocus: (() => void) | undefined;

        const init = async () => {
            try {
                const { getCurrentWindow } = await import('@tauri-apps/api/window');
                const appWindow = getCurrentWindow();

                // Target element to change opacity (body)
                const body = document.body;

                // Add transition for smooth effect
                body.style.transition = 'opacity 0.3s ease';

                // Listen for BLUR (Focus lost)
                unlistenBlur = await appWindow.listen('tauri://blur', async () => {
                    console.log('[WindowEffect] BLUR. Activating Overlay Mode.');
                    // Toggle CSS class for transparency
                    document.body.classList.add('overlay-mode');

                    try {
                        const { invoke } = await import('@tauri-apps/api/core');
                        await invoke('set_ignore_cursor_events', { ignore: true });
                        await invoke('set_always_on_top', { enable: true });
                    } catch (e) {
                        console.error(e);
                    }
                });

                // Listen for FOCUS (Focus regained)
                unlistenFocus = await appWindow.listen('tauri://focus', async () => {
                    console.log('[WindowEffect] FOCUS. Restoring Standard Mode.');
                    // Remove CSS class -> Opaque background
                    document.body.classList.remove('overlay-mode');

                    try {
                        const { invoke } = await import('@tauri-apps/api/core');
                        await invoke('set_ignore_cursor_events', { ignore: false });
                    } catch (e) {
                        console.error(e);
                    }
                });

                // Initial setup
                await appWindow.setAlwaysOnTop(true);
                console.log('[WindowEffect] Initial setAlwaysOnTop(true) called');

            } catch (error) {
                console.error('Failed to initialize WindowEffect:', error);
            }
        };

        init();

        return () => {
            if (unlistenBlur) unlistenBlur();
            if (unlistenFocus) unlistenFocus();

            // Cleanup: Reset opacity and always-on-top on unmount (optional)
            document.body.style.opacity = '1';
        };
    }, []);

    return null;
}
