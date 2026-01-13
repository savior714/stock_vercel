import { isCapacitorEnvironment } from './utils/platform';

export const API_CONFIG = {
    // 모든 환경에서 상대 경로 또는 클라이언트 직접 호출을 사용하므로 BASE_URL은 비워둡니다.
    // Capacitor는 이제 내부 로직(lib/api-client)을 사용합니다.
    BASE_URL: '',

    // 타임아웃 설정
    TIMEOUT_MS: 30000,
};

export const getApiUrl = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_CONFIG.BASE_URL}${cleanPath}`;
};
