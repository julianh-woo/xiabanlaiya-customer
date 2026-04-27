import type { IConfig } from '@tarojs/taro';

const config: IConfig = {
  projectName: '下班来鸭-顾客端',
  date: '2024-01-01',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  defineConstants: {
    API_BASE_URL: JSON.stringify('https://cozejifen.haiei.cn/api'),
    WS_BASE_URL: JSON.stringify('wss://cozejifen.haiei.cn/events'),
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
  },
  alias: {
    '@': './src',
    '@/components': './src/components',
    '@/pages': './src/pages',
    '@/context': './src/context',
    '@/network': './src/network',
    '@/styles': './src/styles',
    '@/utils': './src/utils',
  },
};

export default config;
