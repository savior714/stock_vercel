import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { isCapacitorEnvironment } from '../lib/utils/platform';

interface UseAppLifecycleProps {
    onBack?: () => void;
    onResume?: () => void;
}

export function useAppLifecycle({ onBack, onResume }: UseAppLifecycleProps = {}) {
    useEffect(() => {
        if (isCapacitorEnvironment()) {
            // Handle Back Button
            const backListener = App.addListener('backButton', () => {
                if (onBack) {
                    onBack();
                }
            });

            // Handle App Resume (Foreground transition)
            const resumeListener = App.addListener('appStateChange', (state) => {
                if (state.isActive && onResume) {
                    onResume();
                }
            });

            return () => {
                backListener.then(h => h.remove());
                resumeListener.then(h => h.remove());
            };
        }
    }, [onBack, onResume]);
}
