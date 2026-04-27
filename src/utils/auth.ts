/**
 * Auth Token 管理工具
 * 实现完整的Token缓存、刷新机制
 */
import Taro from '@tarojs/taro';
import { post } from '@/network/request';

// Token 存储的 key
const TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRE_KEY = 'auth_token_expire';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

// Token 信息接口
export interface TokenInfo {
  token: string;
  refreshToken?: string;
  expireAt?: number;
}

// 内存缓存，避免频繁读取storage
let cachedToken: string | null = null;
let cachedExpireAt: number | null = null;
let cachedRefreshToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * 获取本地存储的值
 */
function getStorageSync<T>(key: string): T | null {
  try {
    const value = Taro.getStorageSync(key);
    return value || null;
  } catch (e) {
    console.error(`[Auth] Failed to get storage key "${key}":`, e);
    return null;
  }
}

/**
 * 设置本地存储的值
 */
function setStorageSync(key: string, value: string | number | boolean): void {
  try {
    Taro.setStorageSync(key, value);
  } catch (e) {
    console.error(`[Auth] Failed to set storage key "${key}":`, e);
  }
}

/**
 * 移除本地存储的值
 */
function removeStorageSync(key: string): void {
  try {
    Taro.removeStorageSync(key);
  } catch (e) {
    console.error(`[Auth] Failed to remove storage key "${key}":`, e);
  }
}

/**
 * 初始化缓存 - 从storage读取到内存
 */
export function initAuthCache(): void {
  try {
    cachedToken = getStorageSync<string>(TOKEN_KEY);
    cachedExpireAt = getStorageSync<number>(TOKEN_EXPIRE_KEY);
    cachedRefreshToken = getStorageSync<string>(REFRESH_TOKEN_KEY);
    
    // 检查token是否过期
    if (cachedExpireAt && Date.now() > cachedExpireAt) {
      clearToken();
    }
  } catch (e) {
    console.error('[Auth] Failed to init auth cache:', e);
  }
}

/**
 * 获取Token - 优先从内存缓存读取
 * @returns token字符串或null
 */
export function getToken(): string | null {
  if (cachedToken) {
    return cachedToken;
  }
  
  // 尝试从storage读取
  const token = getStorageSync<string>(TOKEN_KEY);
  if (token) {
    cachedToken = token;
    return token;
  }
  
  return null;
}

/**
 * 存储Token - 同时存储到内存和storage
 * @param token token字符串
 * @param expireInSeconds 过期时间(秒)，可选，默认24小时
 * @param refreshToken 刷新token，可选
 */
export function setToken(
  token: string, 
  expireInSeconds: number = 86400,
  refreshToken?: string
): void {
  const expireAt = Date.now() + expireInSeconds * 1000;
  
  // 更新内存缓存
  cachedToken = token;
  cachedExpireAt = expireAt;
  
  // 存储到本地
  setStorageSync(TOKEN_KEY, token);
  setStorageSync(TOKEN_EXPIRE_KEY, expireAt);
  
  if (refreshToken) {
    cachedRefreshToken = refreshToken;
    setStorageSync(REFRESH_TOKEN_KEY, refreshToken);
  }
  
  console.log('[Auth] Token saved, expires at:', new Date(expireAt).toLocaleString());
}

/**
 * 清除Token - 清除内存和storage
 */
export function clearToken(): void {
  cachedToken = null;
  cachedExpireAt = null;
  cachedRefreshToken = null;
  
  removeStorageSync(TOKEN_KEY);
  removeStorageSync(TOKEN_EXPIRE_KEY);
  removeStorageSync(REFRESH_TOKEN_KEY);
  
  console.log('[Auth] Token cleared');
}

/**
 * 检查Token是否即将过期 (5分钟内)
 */
export function isTokenExpiringSoon(): boolean {
  if (!cachedExpireAt) {
    return false;
  }
  
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() + fiveMinutes > cachedExpireAt;
}

/**
 * 检查Token是否已过期
 */
export function isTokenExpired(): boolean {
  if (!cachedExpireAt) {
    return false;
  }
  
  return Date.now() > cachedExpireAt;
}

/**
 * 获取Token剩余有效时间(秒)
 */
export function getTokenRemainingTime(): number {
  if (!cachedExpireAt) {
    return 0;
  }
  
  const remaining = Math.floor((cachedExpireAt - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

/**
 * 获取刷新Token
 */
export function getRefreshToken(): string | null {
  if (cachedRefreshToken) {
    return cachedRefreshToken;
  }
  
  const refreshToken = getStorageSync<string>(REFRESH_TOKEN_KEY);
  if (refreshToken) {
    cachedRefreshToken = refreshToken;
    return refreshToken;
  }
  
  return null;
}

/**
 * 执行刷新Token请求
 */
async function refreshTokenRequest(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.log('[Auth] No refresh token available');
    return null;
  }
  
  try {
    const response = await post<TokenInfo>('/auth/refresh', { refreshToken });
    
    if (response.code === 200 && response.data) {
      const { token, refreshToken: newRefreshToken, expireAt } = response.data;
      
      // 如果服务端返回过期时间，使用服务端的时间
      if (expireAt) {
        setStorageSync(TOKEN_EXPIRE_KEY, expireAt);
        cachedExpireAt = expireAt;
      }
      
      if (newRefreshToken) {
        setStorageSync(REFRESH_TOKEN_KEY, newRefreshToken);
        cachedRefreshToken = newRefreshToken;
      }
      
      // 更新主token
      cachedToken = token;
      setStorageSync(TOKEN_KEY, token);
      
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('[Auth] Token refresh failed:', error);
    return null;
  }
}

/**
 * 添加刷新订阅者
 */
function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

/**
 * 通知所有订阅者Token已刷新
 */
function notifyTokenRefresh(newToken: string): void {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
}

/**
 * 获取Token并自动处理刷新
 * 当token即将过期时自动刷新
 * @param forceRefresh 强制刷新
 */
export async function getTokenWithRefresh(forceRefresh: boolean = false): Promise<string | null> {
  const currentToken = getToken();
  
  // 没有token
  if (!currentToken) {
    return null;
  }
  
  // 检查是否需要刷新
  if (!forceRefresh && !isTokenExpiringSoon()) {
    return currentToken;
  }
  
  // 正在刷新中，等待刷新完成
  if (isRefreshing) {
    return new Promise<string | null>((resolve) => {
      subscribeTokenRefresh((newToken) => {
        resolve(newToken);
      });
    });
  }
  
  // 开始刷新
  isRefreshing = true;
  
  try {
    // 如果token已过期，尝试刷新
    if (isTokenExpired() || forceRefresh) {
      const newToken = await refreshTokenRequest();
      
      if (newToken) {
        notifyTokenRefresh(newToken);
        return newToken;
      } else {
        // 刷新失败，清除token并跳转登录
        handleAuthFailure();
        return null;
      }
    }
    
    return currentToken;
  } finally {
    isRefreshing = false;
  }
}

/**
 * 处理认证失败
 */
function handleAuthFailure(): void {
  clearToken();
  
  // 跳转登录页
  const currentPages = Taro.getCurrentPages();
  const currentPath = currentPages.length > 0 ? currentPages[currentPages.length - 1].route : '';
  
  if (!currentPath.includes('login')) {
    Taro.redirectTo({
      url: '/pages/login/index'
    });
  }
}

/**
 * 验证Token是否有效
 */
export function isAuthenticated(): boolean {
  return !!getToken() && !isTokenExpired();
}

/**
 * 登录后保存Token信息
 * @param tokenInfo 登录成功后返回的token信息
 */
export function saveLoginToken(tokenInfo: TokenInfo): void {
  if (tokenInfo.token) {
    setToken(
      tokenInfo.token, 
      tokenInfo.expireAt ? Math.floor((tokenInfo.expireAt - Date.now()) / 1000) : 86400,
      tokenInfo.refreshToken
    );
  }
}

/**
 * 获取Authorization Header值
 */
export function getAuthHeader(): string {
  const token = getToken();
  return token ? `Bearer ${token}` : '';
}

export default {
  initAuthCache,
  getToken,
  setToken,
  clearToken,
  getTokenWithRefresh,
  isAuthenticated,
  isTokenExpired,
  isTokenExpiringSoon,
  getTokenRemainingTime,
  getRefreshToken,
  saveLoginToken,
  getAuthHeader,
};
