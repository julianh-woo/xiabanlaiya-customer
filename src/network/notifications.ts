import Taro from '@tarojs/taro';
import { get } from './request';
import { NotificationWithReadStatus } from '@/shared/types/notification';

export interface NotificationResponse {
  code: number;
  message: string;
  data: NotificationWithReadStatus[];
}

/**
 * 获取我的通知列表
 */
export async function getMyNotifications(unreadOnly?: boolean): Promise<NotificationWithReadStatus[]> {
  try {
    const params = unreadOnly ? '?unreadOnly=true' : '';
    const response = await get<NotificationResponse>(`/notifications/my${params}`);
    
    if (response.code === 200 || response.code === 0) {
      return response.data || [];
    }
    throw new Error(response.message || '获取通知列表失败');
  } catch (error) {
    console.error('getMyNotifications error:', error);
    // 返回空数组作为后备
    return [];
  }
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const response = await get<{ code: number; data: { count: number } }>('/notifications/my/unread-count');
    
    if (response.code === 200 || response.code === 0) {
      return response.data?.count || 0;
    }
    return 0;
  } catch (error) {
    console.error('getUnreadCount error:', error);
    return 0;
  }
}

/**
 * 标记通知已读
 */
export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    const response = await Taro.request({
      url: `${process.env.API_BASE || 'https://cozejifen.haiei.cn/api'}/notifications/${id}/read`,
      method: 'PATCH',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Taro.getStorageSync('token')}`,
      },
    });
    
    const data = response.data as { code: number; message: string };
    return data.code === 200 || data.code === 0;
  } catch (error) {
    console.error('markNotificationRead error:', error);
    return false;
  }
}
