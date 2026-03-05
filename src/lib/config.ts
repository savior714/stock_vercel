// Platform Configuration

export const API_CONFIG = {
    // BASE_URL is empty as all environments use relative paths or direct client calls.
    // Capacitor now uses internal logic (lib/api-client).
    BASE_URL: '',

    // Timeout settings
    TIMEOUT_MS: 30000,
};

export const getApiUrl = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_CONFIG.BASE_URL}${cleanPath}`;
};
