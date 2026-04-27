import React, { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { CartProvider } from './context/CartContext';
import { LedgerProvider } from './context/LedgerContext';
import { initAuthCache, isAuthenticated } from './utils/auth';
import './styles/global.scss';

class App extends React.Component {
  componentDidMount() {
    // 初始化 Auth 缓存
    initAuthCache();
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 初始化屏幕适配
    this.initScreenAdaptation();
  }

  checkLoginStatus() {
    const customerId = Taro.getStorageSync('customer_id');
    
    // 如果没有登录信息，设置模拟数据用于预览
    if (!customerId) {
      Taro.setStorageSync('customer_id', 'customer_demo_001');
      Taro.setStorageSync('customer_name', '美食爱好者');
      Taro.setStorageSync('customer_phone', '138****8888');
    }
  }

  initScreenAdaptation() {
    // Taro 默认处理屏幕适配
  }

  render() {
    return (
      <CartProvider>
        <LedgerProvider>
          {this.props.children}
        </LedgerProvider>
      </CartProvider>
    );
  }
}

export default App;
