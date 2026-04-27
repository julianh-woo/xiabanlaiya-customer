import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import {
  getSigninHistory,
  SigninHistoryResponse,
  SigninRecord,
  handleSigninError,
} from '@/network/signin';
import './index.scss';

const SigninHistory: React.FC = () => {
  const [history, setHistory] = useState<SigninHistoryResponse | null>(null);
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
      const data = await getSigninHistory({ page: 1, limit: 20 });
      setHistory(data);
      setHasMore(data.hasMore);
      setPage(1);
    } catch (error) {
      console.error('加载签到记录失败:', error);
      Taro.showToast({
        title: handleSigninError(error) || '加载失败',
        icon: 'none',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !history) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await getSigninHistory({ page: nextPage, limit: 20 });
      
      setHistory({
        ...data,
        list: [...history.list, ...data.list],
      });
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error('加载更多失败:', error);
      Taro.showToast({
        title: handleSigninError(error) || '加载失败',
        icon: 'none',
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return '今天';
    }
    if (dateStr === yesterday.toISOString().split('T')[0]) {
      return '昨天';
    }

    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatWeekday = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 按日期分组
  const groupedRecords = React.useMemo(() => {
    if (!history?.list) return {};

    const groups: Record<string, SigninRecord[]> = {};
    history.list.forEach((record) => {
      const dateKey = record.signDate.split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(record);
    });

    return groups;
  }, [history?.list]);

  const dateKeys = Object.keys(groupedRecords).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const handleScrollToLower = () => {
    if (hasMore && !loadingMore) {
      loadMore();
    }
  };

  if (loading) {
    return (
      <View className="history-page loading">
        <Text>加载中...</Text>
      </View>
    );
  }

  return (
    <View className="history-page">
      {/* 统计卡片 */}
      <View className="stats-card">
        <View className="stat-item">
          <Text className="stat-value">{history?.total || 0}</Text>
          <Text className="stat-label">累计签到</Text>
        </View>
        <View className="stat-divider" />
        <View className="stat-item">
          <Text className="stat-value">
            {Math.max(...(history?.list.map(r => r.consecutiveDays) || [0]))}
          </Text>
          <Text className="stat-label">最长连续</Text>
        </View>
        <View className="stat-divider" />
        <View className="stat-item">
          <Text className="stat-value">
            {history?.list.reduce((sum, r) => sum + r.pointsEarned, 0) || 0}
          </Text>
          <Text className="stat-label">累计鸭蛋</Text>
        </View>
      </View>

      {/* 日历视图 */}
      <View className="calendar-view">
        <Text className="section-title">签到日历</Text>
        <View className="calendar-grid">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <Text key={day} className="calendar-header-day">
              {day}
            </Text>
          ))}
          {/* 填充空白 */}
          {[...Array(new Date(dateKeys[0] ? new Date(dateKeys[0]).getDay() : 0).getDay())].map((_, i) => (
            <View key={`empty-${i}`} className="calendar-day empty" />
          ))}
          {dateKeys.map((dateKey) => {
            const records = groupedRecords[dateKey];
            return records.map((record) => (
              <View
                key={record.id}
                className={`calendar-day ${record.isRepaired ? 'repaired' : 'signed'}`}
              >
                <View className="day-circle">
                  <Text className="day-number">{new Date(dateKey).getDate()}</Text>
                </View>
              </View>
            ));
          })}
        </View>
      </View>

      {/* 签到记录列表 */}
      <View className="records-section">
        <Text className="section-title">签到详情</Text>
        
        {dateKeys.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-icon">📅</Text>
            <Text className="empty-text">暂无签到记录</Text>
            <Text className="empty-hint">快去签到吧~</Text>
          </View>
        ) : (
          <ScrollView
            scrollY
            className="records-list"
            onScrollToLower={handleScrollToLower}
            lowerThreshold={100}
          >
            {dateKeys.map((dateKey) => {
              const records = groupedRecords[dateKey];
              return records.map((record) => (
                <View key={record.id} className="record-item">
                  <View className="record-left">
                    <View className={`record-icon ${record.isRepaired ? 'repaired' : ''}`}>
                      {record.isRepaired ? '🔧' : '✓'}
                    </View>
                    <View className="record-info">
                      <Text className="record-date">
                        {formatDate(dateKey)} {formatWeekday(dateKey)}
                      </Text>
                      <Text className="record-time">{formatTime(record.createdAt)}</Text>
                    </View>
                  </View>
                  <View className="record-right">
                    <Text className="record-points">+{record.pointsEarned}</Text>
                    <Text className="record-points-label">鸭蛋</Text>
                    {record.consecutiveDays > 1 && (
                      <Text className="consecutive-tag">连续{record.consecutiveDays}天</Text>
                    )}
                  </View>
                </View>
              ));
            })}

            {loadingMore && (
              <View className="loading-more">
                <Text>加载中...</Text>
              </View>
            )}

            {!hasMore && history?.list && history.list.length > 0 && (
              <View className="no-more">
                <Text>没有更多了</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default SigninHistory;
