package com.stockanalysis.app;

import android.content.Intent;
import android.os.Build;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onResume() {
        super.onResume();
        // Expose JavaScript interface for service control
        getBridge().getWebView().addJavascriptInterface(
            new AnalysisServiceBridge(), "AnalysisServiceBridge"
        );
    }
    
    /**
     * JavaScript interface to control Foreground Service from WebView
     */
    public class AnalysisServiceBridge {
        
        @JavascriptInterface
        public void startAnalysisService() {
            Intent intent = new Intent(MainActivity.this, AnalysisService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent);
            } else {
                startService(intent);
            }
        }
        
        @JavascriptInterface
        public void stopAnalysisService() {
            Intent intent = new Intent(MainActivity.this, AnalysisService.class);
            intent.setAction("STOP");
            startService(intent);
        }
    }
}
