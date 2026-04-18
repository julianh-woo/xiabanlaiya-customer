import React from 'react';
import { DailyInventory } from '@/shared/types/inventory';
import './index.scss';

export interface StockBadgeProps {
  inventory?: DailyInventory;
  alertThreshold?: number;
  tags?: string[];
  size?: 'small' | 'medium' | 'large';
  showJustCooked?: boolean;
}

export type StockStatus = 'normal' | 'low' | 'soldout' | 'just-cooked';

/**
 * 根据库存信息计算库存状态
 */
export function getStockStatus(
  inventory?: DailyInventory,
  alertThreshold: number = 5,
  tags?: string[]
): StockStatus {
  if (!inventory) {
    return 'soldout';
  }

  const availableQuantity = inventory.stockQuantity - inventory.soldQuantity;

  // 售罄
  if (availableQuantity <= 0) {
    return 'soldout';
  }

  // 库存紧张
  if (availableQuantity <= alertThreshold) {
    return 'low';
  }

  // 刚出锅标签
  if (tags?.includes('刚出锅')) {
    return 'just-cooked';
  }

  return 'normal';
}

/**
 * 获取库存状态显示文本
 */
export function getStockStatusText(
  status: StockStatus,
  availableQuantity?: number
): string {
  switch (status) {
    case 'soldout':
      return '售罄';
    case 'low':
      return availableQuantity !== undefined ? `仅剩${availableQuantity}` : '库存紧张';
    case 'just-cooked':
      return '刚出锅';
    case 'normal':
    default:
      return '';
  }
}

/**
 * 库存标签组件
 * 根据库存状态显示不同的标签样式
 * - normal: 正常库存（绿色或无标签）
 * - low: 库存紧张（橙色）
 * - soldout: 售罄（灰色）
 * - just-cooked: 刚出锅（红色/热力标签）
 */
export const StockBadge: React.FC<StockBadgeProps> = ({
  inventory,
  alertThreshold = 5,
  tags = [],
  size = 'medium',
  showJustCooked = true,
}) => {
  // 计算可用库存
  const availableQuantity = inventory
    ? inventory.stockQuantity - inventory.soldQuantity
    : 0;

  // 获取库存状态
  const status = getStockStatus(inventory, alertThreshold, tags);

  // 获取显示文本
  const statusText = getStockStatusText(status, availableQuantity);

  // 刚出锅标签处理
  const isJustCooked = tags.includes('刚出锅') && status !== 'soldout' && showJustCooked;

  // 如果是正常状态且无刚出锅标签，不显示
  if (status === 'normal' && !isJustCooked) {
    return null;
  }

  // 构建样式类名
  const badgeClass = [
    'stock-badge',
    `stock-badge--${size}`,
    `stock-badge--${status}`,
  ].join(' ');

  return (
    <view className={badgeClass}>
      <text className="stock-badge__text">{statusText || '刚出锅'}</text>
    </view>
  );
};

export default StockBadge;
