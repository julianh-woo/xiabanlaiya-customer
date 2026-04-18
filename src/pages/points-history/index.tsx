import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import {
  getPointsAccount,
  getPointsRecords,
  formatPoints,
  handleApiError,
} from '@/network/points';
import { PointsRecord } from '@/shared/types';
import './index.scss';

const PointsHistory: React.FC = () => {
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [records, setRecords] = useState<PointsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 并行加载积分账户和积分明细
      const [accountData, recordsData] = await Promise.all([
        getPointsAccount(),
        getPointsRecords({ page: 1, limit: 20 }),
      ]);

      setBalance(formatPoints(accountData.balance));
      setTotalEarned(formatPoints(accountData.totalEarned));
      setTotalSpent(formatPoints(accountData.totalSpent));
      setRecords(recordsData.list);
      setHasMore(recordsData.list.length < recordsData.total);
      setPage(1);

      // 缓存积分余额
      Taro.setStorageSync('customer_points_balance', accountData.balance);
    } catch (error) {
      console.error('加载积分明细失败:', error);
      Taro.showToast({
        title: handleApiError(error) || '加载失败',
        icon: 'none',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const recordsData = await getPointsRecords({ page: nextPage, limit: 20 });

      setRecords((prev) => [...prev, ...recordsData.list]);
      setHasMore(recordsData.list.length < recordsData.total);
      setPage(nextPage);
    } catch (error) {
      console.error('加载更多失败:', error);
      Taro.showToast({
        title: handleApiError(error) || '加载失败',
        icon: 'none',
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'earn':
        return '➕';
      case 'spend':
        return '➖';
      case 'revoke':
        return '🔙';
      case 'expire':
        return '⏰';
      case 'recharge':
        return '💰';
      default:
        return '📝';
    }
  };

  const getRecordLabel = (type: string) => {
    switch (type) {
      case 'earn':
        return '获得';
      case 'spend':
        return '消耗';
      case 'revoke':
        return '撤销';
      case 'expire':
        return '过期';
      case 'recharge':
        return '充值';
      default:
        return '变动';
    }
  };

  const getRecordColor = (type: string) => {
    switch (type) {
      case 'earn':
        return '#52c41a';
      case 'spend':
        return '#ff4d4f';
      case 'revoke':
        return '#faad14';
      case 'expire':
        return '#999999';
      case 'recharge':
        return '#52c41a';
      default:
        return '#666666';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  const renderRecordItem = (record: PointsRecord) => {
    const isPositive = record.type === 'earn' || record.type === 'recharge';
    const pointsText = isPositive ? `+${record.points}` : `-${record.points}`;
    const color = getRecordColor(record.type);

    return (
      <View key={record.id} className="record-item">
        <View className="record-item__icon">
          <Text>{getRecordIcon(record.type)}</Text>
        </View>
        <View className="record-item__content">
          <View className="record-item__header">
            <Text className="record-item__title">{getRecordLabel(record.type)}</Text>
            <Text className="record-item__points" style={{ color }}>
              {pointsText}
            </Text>
          </View>
          <Text className="record-item__desc">{record.description || '积分变动'}</Text>
          <View className="record-item__footer">
            <Text className="record-item__date">{formatDate(record.createdAt)}</Text>
            <Text className="record-item__balance">余额: {record.balanceAfter}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="points-history-page">
      {/* 顶部积分余额 */}
      <View className="balance-card">
        <View className="balance-card__header">
          <Text className="balance-card__label">当前积分</Text>
          <Text className="balance-card__value">
            {loading ? '-' : balance.toLocaleString()}
          </Text>
        </View>
        <View className="balance-card__stats">
          <View className="stat-item">
            <Text className="stat-value earn">
              +{loading ? '-' : totalEarned.toLocaleString()}
            </Text>
            <Text className="stat-label">累计获得</Text>
          </View>
          <View className="stat-divider" />
          <View className="stat-item">
            <Text className="stat-value spend">
              -{loading ? '-' : totalSpent.toLocaleString()}
            </Text>
            <Text className="stat-label">累计消耗</Text>
          </View>
        </View>
      </View>

      {/* 积分明细列表 */}
      <View className="records-section">
        <View className="section-header">
          <Text className="section-title">积分明细</Text>
          <Text className="section-subtitle">共{records.length}条记录</Text>
        </View>

        <ScrollView
          scrollY
          className="records-list"
          onScrollToLower={loadMore}
          lowerThreshold={100}
        >
          {loading ? (
            <View className="loading-state">
              <Text className="loading-text">加载中...</Text>
            </View>
          ) : (
            <>
              {records.map((record) => renderRecordItem(record))}

              {loadingMore && (
                <View className="loading-more">
                  <Text className="loading-more__text">加载更多...</Text>
                </View>
              )}

              {!hasMore && records.length > 0 && (
                <View className="no-more">
                  <Text className="no-more__text">没有更多了</Text>
                </View>
              )}

              {records.length === 0 && (
                <View className="empty-state">
                  <Text className="empty-icon">📜</Text>
                  <Text className="empty-text">暂无积分记录</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default PointsHistory;
