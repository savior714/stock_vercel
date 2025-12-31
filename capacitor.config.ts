import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stockanalysis.app',
  appName: 'Stock Analysis',
  webDir: 'out',
  // Production: Use embedded static files
  // Dev: Uncomment server block to use dev server
  // server: {
  //   url: 'http://10.0.2.2:3000',
  //   cleartext: true
  // }
};

export default config;
