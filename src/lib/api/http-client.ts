'use client';

/**
 * Unified HTTP Client for Multi-Platform CORS Bypass
 * 
 * Automatically detects the platform and uses the appropriate fetch method:
 * - Tauri Desktop: @tauri-apps/plugin-http (CORS bypass)
 * - Capacitor Mobile: @capacitor/http (CORS bypass)
 * - Web Browser: Standard fetch (fallback to server API)
 */

import { isTauriEnvironment, isCapacitorEnvironment } from '@/lib/utils/platform';


// Unified fetch function
export async function httpFetch(url: string, options?: RequestInit): Promise<Response> {
    // Tauri Desktop: Use Tauri HTTP plugin
    if (isTauriEnvironment()) {
        try {
            const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
            console.log('🚀 Using Tauri HTTP plugin for:', url);
            return await tauriFetch(url, options);
        } catch (error) {
            console.error('Tauri HTTP plugin error, falling back to standard fetch:', error);
        }
    }

    // Capacitor Mobile: Use Capacitor HTTP plugin
    if (isCapacitorEnvironment()) {
        try {
            const { CapacitorHttp } = await import('@capacitor/core');
            console.log('📱 Using Capacitor HTTP plugin for:', url);

            const response = await CapacitorHttp.request({
                url,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                method: (options?.method as any) || 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...options?.headers as any,
                },
            });

            console.log('📱 Capacitor HTTP response status:', response.status);
            console.log('📱 Capacitor HTTP response data type:', typeof response.data);
            console.log('📱 Capacitor HTTP response data preview:',
                typeof response.data === 'string'
                    ? response.data.substring(0, 200)
                    : JSON.stringify(response.data).substring(0, 200)
            );

            // Convert Capacitor response to standard Response
            // If data is already an object, stringify it; otherwise use as-is
            const bodyData = typeof response.data === 'string'
                ? response.data
                : JSON.stringify(response.data);

            return new Response(bodyData, {
                status: response.status,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                headers: response.headers as any,
            });
        } catch (error) {
            console.error('Capacitor HTTP plugin error, falling back to standard fetch:', error);
        }
    }

    // Web Browser: Standard fetch (fallback)
    console.log('🌐 Using standard fetch for:', url);
    return fetch(url, options);
}
