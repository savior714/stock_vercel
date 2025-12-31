package com.stockanalysis.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Service to keep the app running during stock analysis
 * This prevents Android from suspending the WebView when the app goes to background
 */
public class AnalysisService extends Service {
    
    private static final String CHANNEL_ID = "StockAnalysisChannel";
    private static final int NOTIFICATION_ID = 1;
    private PowerManager.WakeLock wakeLock;
    
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        
        if ("STOP".equals(action)) {
            stopForeground(true);
            stopSelf();
            releaseWakeLock();
            return START_NOT_STICKY;
        }
        
        // Create notification for foreground service
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, 
            PendingIntent.FLAG_IMMUTABLE
        );
        
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("주식 분석 진행 중")
            .setContentText("백그라운드에서 분석이 계속됩니다")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build();
        
        startForeground(NOTIFICATION_ID, notification);
        acquireWakeLock();
        
        return START_STICKY;
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Stock Analysis",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("주식 분석 진행 상태 알림");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private void acquireWakeLock() {
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "StockAnalysis::AnalysisWakeLock"
            );
            wakeLock.acquire(5 * 60 * 1000L); // 5분 타임아웃
        }
    }
    
    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }
    
    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        releaseWakeLock();
    }
}
