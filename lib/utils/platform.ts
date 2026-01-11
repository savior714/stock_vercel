/**
 * Platform Detection Utilities
 * Single Source of Truth for environment detection
 */

export function isTauriEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    // Check for explicit Tauri object or internal object (Tauri v2), OR hostname
    return window.location.hostname === 'tauri.localhost' || '__TAURI__' in window || '__TAURI_INTERNALS__' in window;
}

export function isCapacitorEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Capacitor' in window;
}

export function isNativeEnvironment(): boolean {
    return isTauriEnvironment() || isCapacitorEnvironment();
}
