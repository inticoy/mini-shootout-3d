import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'snapshoot',
  brand: {
    displayName: '스냅슛', // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
    primaryColor: '#35CD21', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    icon: '/public/icon.svg', // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
    bridgeColorMode: 'basic',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'tsc && vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
});
