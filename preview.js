const ci = require('miniprogram-ci');
const path = require('path');

const project = new ci.Project({
  appid: 'wxc48691a5b138cfdb',
  type: 'miniProgram',
  projectPath: './dist',
  privateKeyPath: './private.key',
  ignores: ['node_modules/**/*'],
});

async function preview() {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  const version = process.env.VERSION || `1.0.0.${timestamp}`;
  const desc = process.env.DESC || 'Gitee Go 自动预览';
  
  console.log(`开始预览小程序...`);
  console.log(`版本: ${version}`);
  console.log(`描述: ${desc}`);
  
  const result = await ci.preview({
    project,
    desc: desc,
    version: version,
    setting: {
      es6: true,
      minify: true,
      minifyWXSS: true,
      minifyWXML: true,
    },
    qrcodeFormat: 'image',
    qrcodeOutputDest: './preview-qrcode.jpg',
    onProgressUpdate: (info) => {
      console.log(`进度: ${info.percent}%`);
    },
  });
  
  console.log('预览结果:', JSON.stringify(result, null, 2));
  console.log(`二维码已保存到: ./preview-qrcode.jpg`);
}

preview().catch(err => {
  console.error('预览失败:', err);
  process.exit(1);
});
