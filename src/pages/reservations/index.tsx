import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Reservation, ReservationStatus } from '@/shared/types/reservation';
import { Button, Empty, Loading, Tag, Dialog } from '@/components/ui';
import { get as apiGet, post as apiPost, del as apiDel } from '@/network/request';
import './index.scss';

// API 基础配置
const API_BASE = 'https://cozejifen.haiei.cn/api';
const TENANT_ID = 'default';

interface ReservationListResponse {
  list: Reservation[];
  total: number;
  page: number;
  pageSize: number;
}

interface CreateReservationRequest {
  customerName: string;
  customerPhone: string;
  date: string;
  timeSlot: string;
  partySize?: number;
  remark?: string;
}

const Reservations: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  /**
   * 获取预约列表
   */
  const fetchReservations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiGet<ReservationListResponse>('/reservations', {
        params: {
          page: '1',
          pageSize: '20',
        },
        tenantId: TENANT_ID,
      });

      if (res.data?.list) {
        setReservations(res.data.list);
      } else {
        setReservations([]);
      }
    } catch (err) {
      console.error('获取预约列表失败:', err);
      setError('加载失败');
      Taro.showToast({ title: '加载失败，请下拉刷新', icon: 'none' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 下拉刷新
   */
  const handleRefresh = async () => {
    await fetchReservations();
    Taro.stopPullDownRefresh();
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

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  /**
   * 取消预约
   */
  const handleCancelReservation = async (id: string) => {
    const confirmed = await Dialog.confirm({
      title: '确认取消',
      message: '确定要取消此预约吗？',
      confirmText: '确定取消',
      confirmColor: '#FF4D4F',
    });

    if (confirmed) {
      try {
        await apiDel(`/reservations/${id}`, {
          tenantId: TENANT_ID,
        });
        setReservations(prev =>
          prev.map(r => r.id === id ? { ...r, status: 'cancelled' as ReservationStatus } : r)
        );
        Taro.showToast({ title: '已取消预约', icon: 'success' });
      } catch (err) {
        console.error('取消预约失败:', err);
        Taro.showToast({ title: '取消失败，请重试', icon: 'none' });
      }
    }
  };

  /**
   * 新建预约
   */
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
        {reservation.partySize && (
          <view className="info-row">
            <text className="info-icon">👥</text>
            <text className="info-text">{reservation.partySize}人</text>
          </view>
        )}
        {reservation.remark && (
          <view className="info-row">
            <text className="info-icon">📝</text>
            <text className="info-text">{reservation.remark}</text>
          </view>
        )}
        <view className="info-row">
          <text className="info-icon">📱</text>
          <text className="info-text">{reservation.customerPhone}</text>
        </view>
      </view>

      {['pending', 'confirmed'].includes(reservation.status) && (
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
