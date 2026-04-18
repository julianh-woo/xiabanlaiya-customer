import Taro from '@tarojs/taro';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '@/shared/types';

const BASE_URL = 'https://cozejifen.haiei.cn/api';

interface RequestOptions extends AxiosRequestConfig {
  skipAuth?: boolean;
  skipTenant?: boolean;
}

let globalTenantId: string | null = null;
let authToken: string | null = null;

export function setGlobalTenantId(tenantId: string): void {
  globalTenantId = tenantId;
}

export function getGlobalTenantId(): string | null {
  return globalTenantId;
}

export function setAuthToken(token: string): void {
  authToken = token;
  try {
    Taro.setStorageSync('token', token);
  } catch (e) {
    console.error('Failed to save token:', e);
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  try {
    const token = Taro.getStorageSync('token');
    if (token) {
      authToken = token;
      return token;
    }
  } catch (e) {
    console.error('Failed to get token:', e);
  }
  return null;
}

export function clearAuthToken(): void {
  authToken = null;
  try {
    Taro.removeStorageSync('token');
  } catch (e) {
    console.error('Failed to remove token:', e);
  }
}

function handleUnauthorized(): void {
  clearAuthToken();
  Taro.redirectTo({ url: '/pages/login/index' });
}

// 创建 axios 实例
const instance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    const tenantId = (config as RequestOptions).tenantId || globalTenantId;
    if (tenantId) {
      config.headers.set('X-Tenant-ID', tenantId);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, message, data } = response.data;

    if (code === 401) {
      handleUnauthorized();
      return Promise.reject(new Error('未授权，请重新登录'));
    }

    if (code !== 200 && code !== 0) {
      Taro.showToast({ title: message || '请求失败', icon: 'none' });
      return Promise.reject(new Error(message || '请求失败'));
    }

    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized();
    }
    const message = error.response?.data?.message || error.message || '网络请求失败';
    Taro.showToast({ title: message, icon: 'none' });
    return Promise.reject(error);
  }
);

// 通用请求方法
export function request<T = unknown>(
  config: RequestOptions
): Promise<ApiResponse<T>> {
  return instance.request<ApiResponse<T>>(config).then(res => res.data);
}

// GET 请求
export function get<T = unknown>(
  url: string,
  config?: RequestOptions
): Promise<ApiResponse<T>> {
  return request<T>({ ...config, method: 'GET', url });
}

// POST 请求
export function post<T = unknown>(
  url: string,
  data?: unknown,
  config?: RequestOptions
): Promise<ApiResponse<T>> {
  return request<T>({ ...config, method: 'POST', url, data });
}

// PUT 请求
export function put<T = unknown>(
  url: string,
  data?: unknown,
  config?: RequestOptions
): Promise<ApiResponse<T>> {
  return request<T>({ ...config, method: 'PUT', url, data });
}

// PATCH 请求
export function patch<T = unknown>(
  url: string,
  data?: unknown,
  config?: RequestOptions
): Promise<ApiResponse<T>> {
  return request<T>({ ...config, method: 'PATCH', url, data });
}

// DELETE 请求
export function del<T = unknown>(
  url: string,
  config?: RequestOptions
): Promise<ApiResponse<T>> {
  return request<T>({ ...config, method: 'DELETE', url });
}

// 文件上传
export function uploadFile(
  url: string,
  filePath: string,
  name: string = 'file',
  formData?: Record<string, string>
): Promise<ApiResponse<string>> {
  return new Promise((resolve, reject) => {
    const token = getAuthToken();
    const header: Record<string, string> = {};
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }
    if (globalTenantId) {
      header['X-Tenant-ID'] = globalTenantId;
    }

    Taro.uploadFile({
      url: `${BASE_URL}${url}`,
      filePath,
      name,
      formData,
      header,
      success: (res) => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data) as ApiResponse<string>;
            resolve(data);
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        } else {
          reject(new Error(`上传失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
}

export default {
  request,
  get,
  post,
  put,
  patch,
  del,
  uploadFile,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  setGlobalTenantId,
  getGlobalTenantId,
};
