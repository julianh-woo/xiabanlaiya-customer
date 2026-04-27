import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Button, Switch, Image } from '@tarojs/components';
import {
  getSigninStatus,
  dailySignin,
  getNotificationSettings,
  updateNotificationSettings,
  SigninStatus,
  NotificationSettings,
  formatSigninStatus,
  getBoxTypeText,
  getBoxTypeColor,
  handleSigninError,
} from '@/network/signin';
import './index.scss';

const SigninIndex: React.FC = () => {
  const [status, setStatus] = useState<SigninStatus | null>(null);
  const [notification, setNotification] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusData, notificationData] = await Promise.all([
        getSigninStatus(),
        getNotificationSettings(),
      ]);
      setStatus(statusData);
      setNotification(notificationData);
    } catch (error) {
      console.error('加载签到状态失败:', error);
      Taro.showToast({
        title: handleSigninError(error) || '加载失败',
        icon: 'none',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async () => {
    if (status?.todaySigned) {
      Taro.showToast({ title: '今日已签到', icon: 'none' });
      return;
    }

    setSigning(true);
    try {
      const record = await dailySignin();
      Taro.showToast({
        title: `签到成功！+${record.pointsEarned}鸭蛋`,
        icon: 'success',
      });
      // 刷新状态
      await loadData();
    } catch (error) {
      console.error('签到失败:', error);
      Taro.showToast({
        title: handleSigninError(error) || '签到失败',
        icon: 'none',
      });
    } finally {
      setSigning(false);
    }
  };

  const handleNotificationChange = async (checked: boolean) => {
    if (!notification) return;

    try {
      const updated = await updateNotificationSettings({
        notificationEnabled: checked,
        notificationTime: notification.notificationTime,
      });
      setNotification(updated);

      // 请求订阅消息权限
      if (checked) {
        const res = await Taro.requestSubscribeMessage({
          tmplIds: ['signin_reminder_template_id'], // 需替换为实际的模板ID
        });
        if (res.errMsg !== 'requestSubscribeMessage:ok') {
          Taro.showToast({ title: '请允许订阅通知', icon: 'none' });
        }
      }

      Taro.showToast({
        title: checked ? '已开启提醒' : '已关闭提醒',
        icon: 'success',
      });
    } catch (error) {
      console.error('更新通知设置失败:', error);
      Taro.showToast({
        title: handleSigninError(error) || '设置失败',
        icon: 'none',
      });
    }
  };

  const goToBox = () => {
    if (status?.pendingBoxId) {
      Taro.navigateTo({
        url: `/pages/signin/box/index?boxId=${status.pendingBoxId}&boxType=${status.pendingBoxType}`,
      });
    }
  };

  const goToHistory = () => {
    Taro.navigateTo({
      url: '/pages/signin/history/index',
    });
  };

  const getDayClass = (dayStatus: { signed: boolean; inCurrentCycle: boolean }) => {
    let className = 'calendar-day';
    if (dayStatus.signed) {
      className += ' signed';
    }
    if (dayStatus.inCurrentCycle) {
      className += ' current-cycle';
    }
    return className;
  };

  const getWeekDayLabel = (index: number) => {
    const days = ['一', '二', '三', '四', '五', '六', '日'];
    return `周${days[index]}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  if (loading) {
    return (
      <View className="signin-page loading">
        <Text>加载中...</Text>
      </View>
    );
  }

  return (
    <View className="signin-page">
      {/* 头部区域 */}
      <View className="header">
        <View className="consecutive-info">
          <Text className="consecutive-number">{status?.consecutiveDays || 0}</Text>
          <Text className="consecutive-label">连续签到天数</Text>
        </View>
        <View className="points-info">
          <Text className="points-number">今日+{status?.todayPoints || 0}</Text>
          <Text className="points-label">鸭蛋</Text>
        </View>
      </View>

      {/* 7天日历区域 */}
      <View className="calendar-section">
        <View className="calendar-title">
          <Text>本周签到进度</Text>
          <Text className="progress-text">
            {status?.cycleProgress || 0}/7天
          </Text>
        </View>
        <View className="calendar-grid">
          <View className="calendar-header">
            {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
              <Text key={day} className="week-day">
                周{day}
              </Text>
            ))}
          </View>
          <View className="calendar-body">
            {status?.weekStatus.map((day, index) => (
              <View
                key={day.date || index}
                className={getDayClass(day)}
                onClick={() => day.signed && goToHistory()}
              >
                <View className="day-circle">
                  {day.signed ? (
                    <View className="signed-icon">✓</View>
                  ) : (
                    <Text className="day-number">{index + 1}</Text>
                  )}
                </View>
                <Text className="day-date">{formatDate(day.date)}</Text>
                {day.isRepaired && <Text className="repaired-tag">补</Text>}
              </View>
            ))}
          </View>
        </View>
        {/* 连接线 */}
        <View className="connect-lines">
          {status?.weekStatus.map((day, index) => {
            if (!day.signed) return null;
            const nextDay = status.weekStatus[index + 1];
            if (!nextDay || !nextDay.signed) return null;
            return (
              <View
                key={`line-${index}`}
                className="connect-line"
                style={{ left: `${(index + 0.5) * 14.28}%` }}
              />
            );
          })}
        </View>
      </View>

      {/* 签到按钮 */}
      <View className="signin-action">
        {status?.canOpenBox && (
          <View
            className="box-reminder"
            style={{ backgroundColor: getBoxTypeColor(status.pendingBoxType!) }}
            onClick={goToBox}
          >
            <Text>🎁 有待开{getBoxTypeText(status.pendingBoxType!)}！</Text>
            <Text className="arrow">›</Text>
          </View>
        )}
        <Button
          className={`signin-btn ${status?.todaySigned ? 'signed' : ''}`}
          onClick={handleSignin}
          disabled={status?.todaySigned || signing}
          loading={signing}
        >
          {status?.todaySigned ? '今日已签到 ✓' : '立即签到'}
        </Button>
      </View>

      {/* 补签卡区域 */}
      <View className="repair-section" onClick={goToHistory}>
        <View className="repair-info">
          <Text className="repair-icon">🔧</Text>
          <View className="repair-detail">
            <Text className="repair-title">补签卡</Text>
            <Text className="repair-desc">可补签任意漏签日期</Text>
          </View>
        </View>
        <View className="repair-count">
          <Text className="count">{status?.repairCards || 0}</Text>
          <Text className="unit">张</Text>
        </View>
      </View>

      {/* 通知设置 */}
      <View className="notification-section">
        <View className="notification-info">
          <Text className="notification-icon">🔔</Text>
          <View className="notification-detail">
            <Text className="notification-title">签到提醒</Text>
            <Text className="notification-time">
              每日 {notification?.notificationTime || '17:00'} 提醒
            </Text>
          </View>
        </View>
        <Switch
          checked={notification?.notificationEnabled}
          onChange={(e) => handleNotificationChange(e.detail.value)}
          color="#FFD700"
        />
      </View>

      {/* 历史记录入口 */}
      <View className="history-link" onClick={goToHistory}>
        <Text>查看签到记录</Text>
        <Text className="arrow">›</Text>
      </View>

      {/* 奖励规则说明 */}
      <View className="rules-section">
        <Text className="rules-title">签到奖励规则</Text>
        <View className="rules-list">
          <View className="rule-item">
            <Text className="rule-badge normal">普通</Text>
            <Text className="rule-desc">1-7天连续：基础积分</Text>
          </View>
          <View className="rule-item">
            <Text className="rule-badge rare">稀有</Text>
            <Text className="rule-desc">8-14天连续：积分翻倍</Text>
          </View>
          <View className="rule-item">
            <Text className="rule-badge epic">史诗</Text>
            <Text className="rule-desc">15+天连续：保底大额积分</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SigninIndex;
