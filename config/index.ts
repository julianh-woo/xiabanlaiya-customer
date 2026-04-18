const config = {
  env: {
    NODE_ENV: '"development"',
  },
  defineConstants: {
    API_BASE_URL: '"https://cozejifen.haiei.cn/api"',
    WS_BASE_URL: '"wss://cozejifen.haiei.cn/events"',
  },
  projectName: 'xiabanlaiya-customer',
  date: new Date().toISOString(),
  designWidth: 750,
  deviceRatio: {
    '640': 2.34 / 2,
    '750': 1,
    '828': 1.81 / 2,
    '375': 2 / 1,
    '320': 2.125 / 1,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  compile: {
    include: [],
  },
};

export default function (merge) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, {
      watch: true,
      hot: true,
    });
  }
  return merge({}, config, {});
}
