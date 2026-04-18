import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Button, Empty, Loading } from '@/components/ui';
import { 
  NotificationWithReadStatus,
  NotificationType,
  NOTIFICATION_TYPE_TEXT,
} from '@/shared/types/notification';
import { getMyNotifications, markNotificationRead, getUnreadCount } from '@/network/notifications';
import './index.scss';

const TYPE_COLORS: Record<NotificationType, { bg: string; text: string }> = {
  new_product: { bg: 'bg-purple-light', text: 'text-purple' },
  tasting: { bg: 'bg-orange-light', text: 'text-orange' },
  promotion: { bg: 'bg-green-light', text: 'text-green' },
};

type TabType = 'all' | 'unread';

const TABS: { key: TabType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
];

const NotificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [notifications, setNotifications] = useState<NotificationWithReadStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [activeTab]);

  useEffect(() => {
    // 监听从详情页返回
    const listener = (res) => {
      if (res.from === 'detail') {
        fetchNotifications();
      }
    };
    (Taro.eventCenter as any).on('__taroCallback', listener);
    return () => {
      (Taro.eventCenter as any).off('__taroCallback', listener);
    };
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await getMyNotifications(activeTab === 'unread');
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification: NotificationWithReadStatus) => {
    // 如果未读，先标记已读
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
    }
    
    // 跳转到详情页
    Taro.navigateTo({
      url: `/pages/notifications/detail?id=${notification.id}&title=${encodeURIComponent(notification.title)}`,
    });
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : notifications.filter(n => !n.isRead);

  return (
    <View className="notifications-page">
      {/* Tab */}
      <View className="tab-bar">
        {TABS.map((tab) => (
          <View
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text>{tab.label}</Text>
            {tab.key === 'unread' && notifications.filter(n => !n.isRead).length > 0 && (
              <View className="badge">
                <Text>{notifications.filter(n => !n.isRead).length}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* 内容 */}
      {isLoading ? (
        <Loading />
      ) : filteredNotifications.length === 0 ? (
        <Empty 
          icon="🔔" 
          text={activeTab === 'unread' ? '暂无未读通知' : '暂无通知'} 
        />
      ) : (
        <View className="notification-list">
          {filteredNotifications.map((notification) => (
            <View 
              key={notification.id}
              className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              {/* 左侧类型标识 */}
              <View className="notification-icon">
                <Text>{getTypeEmoji(notification.type)}</Text>
              </View>

              {/* 内容区域 */}
              <View className="notification-content">
                <View className="notification-header">
                  <View className={`type-tag ${TYPE_COLORS[notification.type].bg} ${TYPE_COLORS[notification.type].text}`}>
                    <Text>{NOTIFICATION_TYPE_TEXT[notification.type]}</Text>
                  </View>
                  {!notification.isRead && <View className="unread-dot" />}
                </View>
                
                <Text className="notification-title">{notification.title}</Text>
                <Text className="notification-desc">{notification.content}</Text>
                
                <View className="notification-footer">
                  <Text className="notification-time">
                    {formatDate(notification.sentAt)}
                  </Text>
                  {!notification.isRead && (
                    <Text className="unread-text">未读</Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

function getTypeEmoji(type: NotificationType): string {
  const emojiMap: Record<NotificationType, string> = {
    new_product: '🆕',
    tasting: '🍖',
    promotion: '🎉',
  };
  return emojiMap[type] || '🔔';
}

export default NotificationsPage;
