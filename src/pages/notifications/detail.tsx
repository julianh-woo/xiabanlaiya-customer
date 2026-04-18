import React, { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, Image } from '@tarojs/components';
import { Loading } from '@/components/ui';
import { 
  NotificationWithReadStatus,
  NotificationType,
  NOTIFICATION_TYPE_TEXT,
} from '@/shared/types/notification';
import { getMyNotifications } from '@/network/notifications';
import './index.scss';

const TYPE_COLORS: Record<NotificationType, { bg: string; text: string }> = {
  new_product: { bg: 'bg-purple-light', text: 'text-purple' },
  tasting: { bg: 'bg-orange-light', text: 'text-orange' },
  promotion: { bg: 'bg-green-light', text: 'text-green' },
};

const TYPE_EMOJI: Record<NotificationType, string> = {
  new_product: '🆕',
  tasting: '🍖',
  promotion: '🎉',
};

const NotificationDetailPage: React.FC = () => {
  const router = useRouter();
  const [notification, setNotification] = useState<NotificationWithReadStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotificationDetail();
  }, []);

  const fetchNotificationDetail = async () => {
    setIsLoading(true);
    try {
      const notifications = await getMyNotifications();
      // 从列表中找到对应的通知
      // 或者通过路由参数 id 查找
      const id = router.params.id;
      if (id) {
        const found = notifications.find(n => n.id === id);
        if (found) {
          setNotification(found);
        } else {
          // 如果列表中没有，说明可能已读，直接显示基本信息
          setNotification({
            id: id,
            tenantId: '',
            type: 'new_product',
            title: decodeURIComponent(router.params.title || '通知详情'),
            content: '通知内容已过期或不存在',
            targetTags: [],
            status: 'sent',
            createdAt: '',
            isRead: true,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch notification detail:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!notification) {
    return (
      <View className="notification-detail">
        <View className="empty-state">
          <Text className="empty-icon">🔔</Text>
          <Text className="empty-text">通知不存在</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="notification-detail">
      {/* 通知卡片 */}
      <View className="detail-card">
        {/* 类型标签 */}
        <View className="type-section">
          <View className={`type-tag ${TYPE_COLORS[notification.type].bg} ${TYPE_COLORS[notification.type].text}`}>
            <Text>{TYPE_EMOJI[notification.type]}</Text>
            <Text>{NOTIFICATION_TYPE_TEXT[notification.type]}</Text>
          </View>
        </View>

        {/* 标题 */}
        <Text className="detail-title">{notification.title}</Text>

        {/* 时间 */}
        <Text className="detail-time">{formatDate(notification.sentAt)}</Text>

        {/* 分割线 */}
        <View className="divider" />

        {/* 内容 */}
        <View className="detail-content">
          <Text className="content-text">{notification.content}</Text>
        </View>

        {/* 图片 */}
        {notification.image && (
          <View className="detail-image">
            <Image 
              src={notification.image} 
              mode="widthFix" 
              className="image"
              showMenuByLongpress
            />
          </View>
        )}
      </View>

      {/* 底部提示 */}
      <View className="footer-tip">
        <Text>如有疑问，请联系商家客服</Text>
      </View>
    </View>
  );
};

export default NotificationDetailPage;
