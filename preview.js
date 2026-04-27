/**
 * 微信小程序预览脚本
 * 使用 miniprogram-ci 进行预览上传
 * 
 * 使用方式:
 *   node preview.js                    # 使用本地配置
 *   node preview.js --appid xxx       # 指定appid
 *   node preview.js --key ./key.pem   # 指定私钥路径
 * 
 * 环境变量:
 *   WECHAT_APPID          微信小程序AppID
 *   WECHAT_PRIVATE_KEY    微信小程序私钥内容
 */

const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

// 解析命令行参数
const args = process.argv.slice(2);
let appid = 'wxc48691a5b138cfdb';  // 默认AppID
let privateKeyPath = './private.key';
let version = `1.0.0.${Date.now()}`;
let desc = '本地预览上传';

// 解析参数
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--appid' && args[i + 1]) {
    appid = args[i + 1];
    i++;
  } else if (args[i] === '--key' && args[i + 1]) {
    privateKeyPath = args[i + 1];
    i++;
  } else if (args[i] === '--version' && args[i + 1]) {
    version = args[i + 1];
    i++;
  } else if (args[i] === '--desc' && args[i + 1]) {
    desc = args[i + 1];
    i++;
  }
}

// 从环境变量获取配置
const envAppid = process.env.WECHAT_APPID;
const envPrivateKey = process.env.WECHAT_PRIVATE_KEY;

if (envAppid) {
  appid = envAppid;
}

const projectPath = path.resolve(__dirname, './dist');
const ignores = ['node_modules/**/*'];

// 创建项目配置
const projectConfig = {
  appid,
  type: 'miniProgram',
  projectPath,
  ignores,
};

// 如果有私钥内容，写入临时文件
if (envPrivateKey) {
  const tmpKeyPath = path.resolve(__dirname, './tmp_private.key');
  fs.writeFileSync(tmpKeyPath, envPrivateKey);
  projectConfig.privateKeyPath = tmpKeyPath;
  privateKeyPath = tmpKeyPath;
}

console.log('='.repeat(50));
console.log('微信小程序预览配置:');
console.log(`  AppID: ${appid}`);
console.log(`  项目路径: ${projectPath}`);
console.log(`  私钥路径: ${privateKeyPath}`);
console.log(`  版本号: ${version}`);
console.log(`  描述: ${desc}`);
console.log('='.repeat(50));

async function preview() {
  let project;
  
  try {
    // 检查私钥文件是否存在
    if (!fs.existsSync(privateKeyPath)) {
      console.warn('⚠️  私钥文件不存在，跳过预览上传');
      console.warn('   请确保已配置 WECHAT_PRIVATE_KEY 环境变量或创建 private.key 文件');
      console.warn('   你仍然可以手动在微信开发者工具中导入 dist 目录进行预览');
      
      // 列出dist目录内容确认构建成功
      console.log('\n📦 dist目录内容:');
      const distFiles = fs.readdirSync(projectPath);
      console.log(`   ${distFiles.length} 个文件/目录`);
      return;
    }
    
    project = new ci.Project(projectConfig);
    
    console.log('\n🚀 开始上传预览...');
    
    const result = await ci.preview({
      project,
      desc,
      version,
      setting: {
        es6: true,
        minify: true,
        minifyWXSS: true,
        minifyWXML: true,
        codeProtect: false,
        enableAutoVerifier: false,
      },
      qrcodeFormat: 'image',
      qrcodeOutputDest: path.resolve(__dirname, './preview-qrcode.jpg'),
      onProgressUpdate: (info) => {
        process.stdout.write(`\r   进度: ${info.percent}%`);
      },
    });
    
    console.log('\n\n✅ 预览上传成功!');
    console.log('='.repeat(50));
    console.log('上传结果:');
    console.log(`  版本: ${result.version}`);
    console.log(`  描述: ${result.desc}`);
    console.log(`  构建ID: ${result.buildInfoSuffix}`);
    console.log('='.repeat(50));
    console.log(`\n📱 二维码已保存到: ./preview-qrcode.jpg`);
    console.log('\n请使用微信扫描二维码进行预览');
    
    // 清理临时文件
    if (envPrivateKey && fs.existsSync(path.resolve(__dirname, './tmp_private.key'))) {
      fs.unlinkSync(path.resolve(__dirname, './tmp_private.key'));
    }
    
  } catch (err) {
    console.error('\n\n❌ 预览上传失败!');
    console.error('='.repeat(50));
    console.error('错误信息:', err.message);
    
    if (err.message && err.message.includes('private key')) {
      console.error('\n💡 提示: 私钥配置错误');
      console.error('   请确保:');
      console.error('   1. private.key 文件存在于项目根目录');
      console.error('   2. 或配置 WECHAT_PRIVATE_KEY 环境变量');
      console.error('   3. 私钥是从微信公众平台获取的正确私钥');
    } else if (err.message && err.message.includes('appid')) {
      console.error('\n💡 提示: AppID配置错误');
      console.error('   当前AppID:', appid);
    }
    
    console.error('='.repeat(50));
    
    // 清理临时文件
    if (envPrivateKey && fs.existsSync(path.resolve(__dirname, './tmp_private.key'))) {
      fs.unlinkSync(path.resolve(__dirname, './tmp_private.key'));
    }
    
    process.exit(1);
  }
}

preview();
