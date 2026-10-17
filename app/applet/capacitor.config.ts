import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cnf.objectiveReacher',
  appName: 'Objective Reacher',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
