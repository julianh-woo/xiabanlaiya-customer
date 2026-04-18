import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { Button } from '@/components/ui';
import {
  getPointsAccount,
  getRewards,
  redeemReward,
  formatPoints,
  getAvailableStock,
  isOutOfStock,
  canAfford,
  handleApiError,
} from '@/network/points';
import { Reward } from '@/shared/types';
import './index.scss';

const categoryMap = {
  all: '全部',
  coupon: '优惠券',
  physical: '实物',
  service: '服务',
  special: '特色',
};

const PointsMall: React.FC = () => {
  const [balance, setBalance] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 并行加载积分账户和商品列表
      const [accountData, rewardsData] = await Promise.all([
        getPointsAccount(),
        getRewards(),
      ]);

      setBalance(formatPoints(accountData.balance));
      setRewards(rewardsData);

      // 缓存积分余额
      Taro.setStorageSync('customer_points_balance', accountData.balance);
    } catch (error) {
      console.error('加载积分商城数据失败:', error);
      Taro.showToast({
        title: handleApiError(error) || '加载失败',
        icon: 'none',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRewards = () => {
    if (activeTab === 'all') {
      return rewards;
    }
    return rewards.filter((r) => r.category === activeTab);
  };

  const handleRedeem = async (reward: Reward) => {
    // 前端预检查
    if (isOutOfStock(reward)) {
      Taro.showToast({ title: '库存不足', icon: 'none' });
      return;
    }

    if (!canAfford(balance, reward)) {
      Taro.showToast({ title: '积分不足', icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '确认兑换',
      content: `确定用 ${reward.pointsCost} 积分兑换「${reward.name}」吗？`,
      success: async (res) => {
        if (res.confirm) {
          setRedeeming(reward.id);
          try {
            // 调用API进行兑换
            await redeemReward(reward.id);

            Taro.showToast({ title: '兑换成功', icon: 'success' });

            // 更新本地积分余额
            const newBalance = balance - reward.pointsCost;
            setBalance(newBalance);
            Taro.setStorageSync('customer_points_balance', newBalance);

            // 更新商品库存（乐观更新）
            setRewards((prev) =>
              prev.map((r) =>
                r.id === reward.id
                  ? { ...r, stockUsed: r.stockUsed + 1 }
                  : r
              )
            );
          } catch (error) {
            console.error('兑换失败:', error);
            Taro.showToast({
              title: handleApiError(error) || '兑换失败',
              icon: 'none',
            });
          } finally {
            setRedeeming(null);
          }
        }
      },
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'coupon':
        return '🎫';
      case 'physical':
        return '🎁';
      case 'service':
        return '🛠️';
      case 'special':
        return '⭐';
      default:
        return '📦';
    }
  };

  const renderRewardCard = (reward: Reward) => {
    const availableStock = getAvailableStock(reward);
    const outOfStock = isOutOfStock(reward);
    const affordable = canAfford(balance, reward);
    const isRedeeming = redeeming === reward.id;

    return (
      <View key={reward.id} className="reward-card">
        <View className="reward-card__image">
          <Text className="reward-card__icon">{getCategoryIcon(reward.category)}</Text>
        </View>
        <View className="reward-card__content">
          <Text className="reward-card__name">{reward.name}</Text>
          <Text className="reward-card__desc">{reward.description}</Text>
          <View className="reward-card__footer">
            <View className="reward-card__points">
              <Text className="points-value">{reward.pointsCost}</Text>
              <Text className="points-label">积分</Text>
            </View>
            <View className="reward-card__stock">
              <Text className={`stock-text ${outOfStock ? 'out-of-stock' : ''}`}>
                {outOfStock
                  ? '已兑完'
                  : availableStock === 'unlimited'
                  ? '库存: 无限'
                  : `库存: ${availableStock}`}
              </Text>
            </View>
          </View>
          <Button
            type={outOfStock || !affordable ? 'default' : 'primary'}
            size="small"
            disabled={outOfStock || isRedeeming}
            loading={isRedeeming}
            onClick={() => handleRedeem(reward)}
            className="reward-card__btn"
          >
            {outOfStock
              ? '已兑完'
              : !affordable
              ? '积分不足'
              : isRedeeming
              ? '兑换中...'
              : '立即兑换'}
          </Button>
        </View>
      </View>
    );
  };

  return (
    <View className="points-mall-page">
      {/* 顶部积分余额 */}
      <View className="balance-header">
        <View className="balance-info">
          <Text className="balance-label">我的积分</Text>
          <Text className="balance-value">
            {loading ? '-' : balance.toLocaleString()}
          </Text>
        </View>
        <View className="balance-actions">
          <Button
            type="primary"
            size="small"
            onClick={() => Taro.showToast({ title: '充值功能开发中', icon: 'none' })}
          >
            积分充值
          </Button>
        </View>
      </View>

      {/* 分类Tab */}
      <View className="category-tabs">
        <ScrollView scrollX className="tabs-scroll">
          {Object.entries(categoryMap).map(([key, label]) => (
            <View
              key={key}
              className={`tab-item ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <Text>{label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 积分商品列表 */}
      <ScrollView scrollY className="rewards-list">
        {loading ? (
          <View className="loading-state">
            <Text className="loading-text">加载中...</Text>
          </View>
        ) : (
          <>
            <View className="rewards-grid">
              {getFilteredRewards().map((reward) => renderRewardCard(reward))}
            </View>
            {getFilteredRewards().length === 0 && (
              <View className="empty-state">
                <Text className="empty-icon">🛒</Text>
                <Text className="empty-text">暂无相关商品</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* 积分说明 */}
      <View className="points-tips">
        <Text className="tips-title">积分规则</Text>
        <Text className="tips-content">
          • 每消费1元 = 1积分{'\n'}
          • 积分可用于兑换商城商品{'\n'}
          • 积分不可提现，不找零
        </Text>
      </View>
    </View>
  );
};

export default PointsMall;
