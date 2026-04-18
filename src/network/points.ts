/**
 * 积分商城 API
 * 基于项目统一的 request 封装
 */
import Taro from '@tarojs/taro';
import { get, post } from './request';
import { ApiResponse } from '@/shared/types';
import {
  PointsAccount,
  PointsRecord,
  Reward,
  PointRedemption,
} from '@/shared/types';
import { PaginatedResponse } from '@/shared/types';

// 获取积分账户
export async function getPointsAccount(): Promise<PointsAccount> {
  const res = await get<PointsAccount>('/points/account');
  return res.data;
}

// 获取积分明细
export async function getPointsRecords(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<PointsRecord>> {
  const res = await get<PaginatedResponse<PointsRecord>>('/points/records', {
    params,
  });
  return res.data;
}

// 获取商品列表
export async function getRewards(): Promise<Reward[]> {
  const res = await get<Reward[]>('/points/rewards');
  return res.data;
}

// 获取兑换记录
export async function getRedemptions(): Promise<PointRedemption[]> {
  const res = await get<PointRedemption[]>('/points/redemptions');
  return res.data;
}

// 兑换商品
export async function redeemReward(rewardId: string): Promise<PointRedemption> {
  const res = await post<PointRedemption>('/points/redeem', { rewardId });
  return res.data;
}

// 获取单个兑换记录详情
export async function getRedemptionDetail(
  redemptionId: string
): Promise<PointRedemption> {
  const res = await get<PointRedemption>(`/points/redemptions/${redemptionId}`);
  return res.data;
}

// 格式化积分（显示为整数）
export function formatPoints(points: number | string): number {
  return Number(points);
}

// 获取可用库存
export function getAvailableStock(reward: Reward): number | 'unlimited' {
  if (reward.stock === 9999) {
    return 'unlimited';
  }
  return reward.stock - reward.stockUsed;
}

// 判断是否缺货
export function isOutOfStock(reward: Reward): boolean {
  if (reward.stock === 9999) {
    return false;
  }
  return reward.stockUsed >= reward.stock;
}

// 判断积分是否足够
export function canAfford(balance: number, reward: Reward): boolean {
  return balance >= reward.pointsCost;
}

// 获取兑换状态的显示文本
export function getRedemptionStatusText(
  status: PointRedemption['status']
): string {
  const statusMap: Record<PointRedemption['status'], string> = {
    pending: '待使用',
    claimed: '已核销',
    expired: '已过期',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
}

// 获取积分类型的显示文本
export function getPointsTypeText(type: PointsRecord['type']): string {
  const typeMap: Record<PointsRecord['type'], string> = {
    earn: '获得',
    spend: '消耗',
    revoke: '撤销',
    expire: '过期',
    recharge: '充值',
  };
  return typeMap[type] || type;
}

// 友好的错误提示
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    // 处理常见的业务错误
    const message = error.message;
    if (message.includes('积分余额不足')) {
      return '积分不足，无法完成兑换';
    }
    if (message.includes('库存不足')) {
      return '库存不足，请选择其他商品';
    }
    if (message.includes('已下架')) {
      return '该商品已下架';
    }
    if (message.includes('不存在')) {
      return '商品不存在';
    }
    if (message.includes('401') || message.includes('未授权')) {
      return '请先登录';
    }
    return message;
  }
  return '操作失败，请稍后重试';
}
