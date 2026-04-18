import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Reservation, ReservationStatus, RESERVATION_STATUS_TEXT } from '@/shared/types/reservation';
import { Button, Empty, Loading, Tag, Dialog } from '@/components/ui';
import './index.scss';

// Mock 预约数据
const mockReservations: Reservation[] = [
  {
    id: 'r001',
    tenantId: 't001',
    customerId: 'c001',
    customerName: '张三',
    customerPhone: '138****8888',
    date: '2024-01-20',
    timeSlot: '18:00-19:00',
    partySize: 4,
    remark: '需要儿童座椅',
    status: 'confirmed',
    confirmTime: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'r002',
    tenantId: 't001',
    customerId: 'c001',
    customerName: '张三',
    customerPhone: '138****8888',
    date: '2024-01-25',
    timeSlot: '12:00-13:00',
    partySize: 2,
    status: 'pending',
    createdAt: '2024-01-18T14:00:00Z',
    updatedAt: '2024-01-18T14:00:00Z',
  },
  {
    id: 'r003',
    tenantId: 't001',
    customerId: 'c001',
    customerName: '张三',
    customerPhone: '138****8888',
    date: '2024-01-10',
    timeSlot: '19:00-20:00',
    partySize: 5,
    status: 'completed',
    confirmTime: '2024-01-08T10:00:00Z',
    completeTime: '2024-01-10T21:00:00Z',
    createdAt: '2024-01-08T09:00:00Z',
    updatedAt: '2024-01-10T21:00:00Z',
  },
];

const Reservations: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewReservation, setShowNewReservation] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setReservations(mockReservations);
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusTag = (status: ReservationStatus) => {
    const config: Record<ReservationStatus, { type: 'primary' | 'success' | 'warning' | 'danger' | 'default'; text: string }> = {
      pending: { type: 'warning', text: '待确认' },
      confirmed: { type: 'primary', text: '已确认' },
      completed: { type: 'success', text: '已完成' },
      cancelled: { type: 'default', text: '已取消' },
      no_show: { type: 'danger', text: '未到店' },
    };
    const { type, text } = config[status];
    return <Tag type={type} size="small">{text}</Tag>;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekDay}`;
  };

  const handleCancelReservation = async (id: string) => {
    const confirmed = await Dialog.confirm({
      title: '确认取消',
      message: '确定要取消此预约吗？',
      confirmText: '确定取消',
      confirmColor: '#FF4D4F',
    });

    if (confirmed) {
      setReservations(prev =>
        prev.map(r => r.id === id ? { ...r, status: 'cancelled' as ReservationStatus } : r)
      );
      Taro.showToast({ title: '已取消预约', icon: 'success' });
    }
  };

  const handleNewReservation = () => {
    Taro.navigateTo({ url: '/pages/reservations/new' });
  };

  const renderReservationCard = (reservation: Reservation) => (
    <view key={reservation.id} className="reservation-card">
      <view className="reservation-card__header">
        <text className="reservation-date">{formatDate(reservation.date)}</text>
        {getStatusTag(reservation.status)}
      </view>

      <view className="reservation-card__content">
        <view className="info-row">
          <text className="info-icon">🕐</text>
          <text className="info-text">{reservation.timeSlot}</text>
        </view>
        <view className="info-row">
          <text className="info-icon">👥</text>
          <text className="info-text">{reservation.partySize}人</text>
        </view>
        {reservation.remark && (
          <view className="info-row">
            <text className="info-icon">📝</text>
            <text className="info-text">{reservation.remark}</text>
          </view>
        )}
      </view>

      {reservation.status === 'pending' && (
        <view className="reservation-card__action">
          <Button
            type="danger"
            size="small"
            plain
            onClick={() => handleCancelReservation(reservation.id)}
          >
            取消预约
          </Button>
        </view>
      )}
    </view>
  );

  const upcomingReservations = reservations.filter(r => ['pending', 'confirmed'].includes(r.status));
  const pastReservations = reservations.filter(r => ['completed', 'cancelled', 'no_show'].includes(r.status));

  return (
    <view className="reservations-page">
      {/* 新建预约按钮 */}
      <view className="page-header">
        <Button type="primary" size="large" block onClick={handleNewReservation}>
          新建预约
        </Button>
      </view>

      {isLoading ? (
        <Loading text="加载中..." />
      ) : reservations.length === 0 ? (
        <Empty text="暂无预约" />
      ) : (
        <view className="reservation-list">
          {/* 待处理/已确认预约 */}
          {upcomingReservations.length > 0 && (
            <view className="section">
              <view className="section-title">
                <text>即将到来</text>
                <text className="section-count">{upcomingReservations.length}</text>
              </view>
              {upcomingReservations.map(renderReservationCard)}
            </view>
          )}

          {/* 历史预约 */}
          {pastReservations.length > 0 && (
            <view className="section">
              <view className="section-title">
                <text>历史预约</text>
                <text className="section-count">{pastReservations.length}</text>
              </view>
              {pastReservations.map(renderReservationCard)}
            </view>
          )}
        </view>
      )}
    </view>
  );
};

export default Reservations;
