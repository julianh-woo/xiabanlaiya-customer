/**
 * 签到模块 API
 */
import Taro from '@tarojs/taro';
import { get, post, put } from './request';
import { ApiResponse } from '@shared/types';
import { PaginatedResponse } from '@shared/types';

// ==================== 类型定义 ====================

export interface DayStatus {
  date: string;
  signed: boolean;
  inCurrentCycle: boolean;
  recordId?: string;
  isRepaired?: boolean;
}

export interface SigninStatus {
  todaySigned: boolean;
  consecutiveDays: number;
  cycleProgress: number;
  cycleId: number;
  cycleStartDate: string;
  cycleEndDate: string;
  todayPoints: number;
  repairCards: number;
  weekStatus: DayStatus[];
  canOpenBox: boolean;
  pendingBoxType?: 'normal' | 'rare' | 'epic';
  pendingBoxId?: string;
}

export interface SigninRecord {
  id: string;
  userId: string;
  signDate: string;
  consecutiveDays: number;
  isRepaired: boolean;
  repairedDate?: string;
  pointsEarned: number;
  createdAt: string;
}

export interface SigninHistoryResponse {
  list: SigninRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface NotificationSettings {
  notificationEnabled: boolean;
  notificationTime: string;
}

export interface BoxReward {
  id: string;
  boxType: 'normal' | 'rare' | 'epic';
  rewardType: string;
  rewardValue: number;
  rewardDesc: string;
  openedAt: string;
  cycleId: number;
}

// ==================== API 函数 ====================

/**
 * 获取签到状态
 * GET /api/signin/status
 */
export async function getSigninStatus(): Promise<SigninStatus> {
  const res = await get<SigninStatus>('/signin/status');
  return res.data;
}

/**
 * 每日签到
 * POST /api/signin/daily
 */
export async function dailySignin(signDate?: string): Promise<SigninRecord> {
  const res = await post<SigninRecord>('/signin/daily', {
    signDate,
  });
  return res.data;
}

/**
 * 获取签到历史
 * GET /api/signin/history
 */
export async function getSigninHistory(params?: {
  page?: number;
  limit?: number;
}): Promise<SigninHistoryResponse> {
  const res = await get<SigninHistoryResponse>('/signin/history', { params });
  return res.data;
}

/**
 * 开盲盒
 * POST /api/signin/open
 */
export async function openBox(boxId: string): Promise<BoxReward> {
  const res = await post<BoxReward>('/signin/open', { boxId });
  return res.data;
}

/**
 * 使用补签卡补签
 * POST /api/signin/repair
 */
export async function repairSignin(targetDate: string): Promise<SigninRecord> {
  const res = await post<SigninRecord>('/signin/repair', { targetDate });
  return res.data;
}

/**
 * 获取通知设置
 * GET /api/signin/notification
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const res = await get<NotificationSettings>('/signin/notification');
  return res.data;
}

/**
 * 更新通知设置
 * PUT /api/signin/notification
 */
export async function updateNotificationSettings(
  settings: NotificationSettings,
): Promise<NotificationSettings> {
  const res = await put<NotificationSettings>('/signin/notification', settings);
  return res.data;
}

// ==================== 工具函数 ====================

/**
 * 格式化签到状态显示
 */
export function formatSigninStatus(status: SigninStatus): string {
  if (status.todaySigned) {
    return `已连续签到 ${status.consecutiveDays} 天`;
  }
  return `连续签到 ${status.consecutiveDays} 天，继续加油！`;
}

/**
 * 获取盲盒类型文案
 */
export function getBoxTypeText(boxType: 'normal' | 'rare' | 'epic'): string {
  switch (boxType) {
    case 'rare':
      return '稀有盲盒';
    case 'epic':
      return '史诗盲盒';
    default:
      return '普通盲盒';
  }
}

/**
 * 获取盲盒类型颜色
 */
export function getBoxTypeColor(boxType: 'normal' | 'rare' | 'epic'): string {
  switch (boxType) {
    case 'rare':
      return '#6c5ce7';
    case 'epic':
      return '#e17055';
    default:
      return '#74b9ff';
  }
}

/**
 * 格式化奖励描述
 */
export function formatRewardDesc(reward: BoxReward): string {
  const typeMap = {
    POINTS: '鸭蛋',
    REPAIR_CARD: '补签卡',
    COUPON: '优惠券',
  };
  return `${reward.rewardValue}${typeMap[reward.rewardType as keyof typeof typeMap] || ''}`;
}

/**
 * API 错误处理
 */
export function handleSigninError(error: any): string {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return '操作失败，请重试';
}
