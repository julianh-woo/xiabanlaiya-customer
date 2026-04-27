import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Button, Input, Loading, Dialog } from '@/components/ui';
import { post as apiPost, get as apiGet } from '@/network/request';
import './index.scss';

// API 基础配置
const API_BASE = 'https://cozejifen.haiei.cn/api';
const TENANT_ID = 'default';

interface TimeSlot {
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
}

interface CreateReservationRequest {
  customerName: string;
  customerPhone: string;
  date: string;
  timeSlot: string;
  partySize?: number;
  remark?: string;
}

const ReservationNew: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

  // 表单数据
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [remark, setRemark] = useState('');

  useEffect(() => {
    // 加载用户信息
    const savedName = Taro.getStorageSync('customer_name');
    const savedPhone = Taro.getStorageSync('customer_phone');
    if (savedName) setCustomerName(savedName);
    if (savedPhone) setCustomerPhone(savedPhone);

    // 获取可用日期
    fetchAvailableDates();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedDate]);

  /**
   * 获取可预约日期（未来7天）
   */
  const fetchAvailableDates = async () => {
    setIsLoading(true);
    try {
      // 生成未来7天的日期
      const dates: string[] = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
      setAvailableDates(dates);

      // 默认选择今天
      if (dates.length > 0) {
        setSelectedDate(dates[0]);
      }
    } catch (err) {
      console.error('获取可用日期失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 获取时间段
   */
  const fetchTimeSlots = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<{ timeSlots: TimeSlot[] }>('/reservations/timeslots', {
        params: { date: selectedDate },
        tenantId: TENANT_ID,
      });

      if (res.data?.timeSlots) {
        setTimeSlots(res.data.timeSlots);
      } else {
        // 默认时间段
        setTimeSlots([
          { startTime: '11:00', endTime: '12:00', capacity: 10, bookedCount: 0 },
          { startTime: '12:00', endTime: '13:00', capacity: 10, bookedCount: 0 },
          { startTime: '17:00', endTime: '18:00', capacity: 10, bookedCount: 0 },
          { startTime: '18:00', endTime: '19:00', capacity: 10, bookedCount: 0 },
          { startTime: '19:00', endTime: '20:00', capacity: 10, bookedCount: 0 },
          { startTime: '20:00', endTime: '21:00', capacity: 10, bookedCount: 0 },
        ]);
      }
    } catch (err) {
      console.error('获取时间段失败:', err);
      // 使用默认时间段
      setTimeSlots([
        { startTime: '11:00', endTime: '12:00', capacity: 10, bookedCount: 0 },
        { startTime: '12:00', endTime: '13:00', capacity: 10, bookedCount: 0 },
        { startTime: '17:00', endTime: '18:00', capacity: 10, bookedCount: 0 },
        { startTime: '18:00', endTime: '19:00', capacity: 10, bookedCount: 0 },
        { startTime: '19:00', endTime: '20:00', capacity: 10, bookedCount: 0 },
        { startTime: '20:00', endTime: '21:00', capacity: 10, bookedCount: 0 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 格式化日期显示
   */
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return '今天';
    }
    if (dateStr === tomorrow.toISOString().split('T')[0]) {
      return '明天';
    }

    const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekDay}`;
  };

  /**
   * 验证表单
   */
  const validateForm = (): boolean => {
    if (!customerName.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' });
      return false;
    }
    if (!customerPhone.trim()) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' });
      return false;
    }
    if (!/^1[3-9]\d{9}$/.test(customerPhone)) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return false;
    }
    if (!selectedTimeSlot) {
      Taro.showToast({ title: '请选择时间段', icon: 'none' });
      return false;
    }
    return true;
  };

  /**
   * 提交预约
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const data: CreateReservationRequest = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        partySize,
        remark: remark.trim() || undefined,
      };

      const res = await apiPost('/reservations', data, {
        tenantId: TENANT_ID,
      });

      if (res.code === 200 || res.code === 0) {
        // 保存用户信息
        Taro.setStorageSync('customer_name', customerName.trim());
        Taro.setStorageSync('customer_phone', customerPhone.trim());

        Taro.showToast({ title: '预约成功', icon: 'success' });
        setTimeout(() => {
          Taro.navigateBack();
        }, 1500);
      } else {
        throw new Error(res.message || '预约失败');
      }
    } catch (err: any) {
      console.error('预约失败:', err);
      Taro.showToast({ title: err.message || '预约失败，请重试', icon: 'none' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 检查时间段是否可用
   */
  const isSlotAvailable = (slot: TimeSlot) => {
    return slot.bookedCount < slot.capacity;
  };

  const goBack = () => {
    Taro.navigateBack();
  };

  return (
    <view className="reservation-new-page">
      {/* 日期选择 */}
      <view className="section date-section">
        <view className="section__header">
          <text className="section__title">选择日期</text>
        </view>
        <view className="date-list">
          {availableDates.map((date) => (
            <view
              key={date}
              className={`date-item ${selectedDate === date ? 'active' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <text className="date-text">{formatDateDisplay(date)}</text>
            </view>
          ))}
        </view>
      </view>

      {/* 时间段选择 */}
      <view className="section time-section">
        <view className="section__header">
          <text className="section__title">选择时间</text>
        </view>
        {isLoading ? (
          <Loading text="加载中..." />
        ) : (
          <view className="time-list">
            {timeSlots.map((slot) => {
              const available = isSlotAvailable(slot);
              const timeStr = `${slot.startTime}-${slot.endTime}`;
              return (
                <view
                  key={timeStr}
                  className={`time-item ${!available ? 'disabled' : ''} ${selectedTimeSlot === timeStr ? 'active' : ''}`}
                  onClick={() => available && setSelectedTimeSlot(timeStr)}
                >
                  <text className="time-text">{timeStr}</text>
                  <text className="time-status">
                    {available ? `${slot.capacity - slot.bookedCount}位可约` : '已约满'}
                  </text>
                </view>
              );
            })}
          </view>
        )}
      </view>

      {/* 联系信息 */}
      <view className="section contact-section">
        <view className="section__header">
          <text className="section__title">联系信息</text>
        </view>
        <view className="form-list">
          <view className="form-item">
            <text className="form-label">姓名</text>
            <Input
              className="form-input"
              value={customerName}
              onChange={setCustomerName}
              placeholder="请输入您的姓名"
            />
          </view>
          <view className="form-item">
            <text className="form-label">手机号</text>
            <Input
              className="form-input"
              type="phone"
              value={customerPhone}
              onChange={setCustomerPhone}
              placeholder="请输入手机号"
            />
          </view>
          <view className="form-item">
            <text className="form-label">人数</text>
            <view className="party-size-selector">
              <view
                className="size-btn"
                onClick={() => setPartySize(Math.max(1, partySize - 1))}
              >
                <text>-</text>
              </view>
              <text className="size-value">{partySize}</text>
              <view
                className="size-btn"
                onClick={() => setPartySize(Math.min(20, partySize + 1))}
              >
                <text>+</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      {/* 备注 */}
      <view className="section remark-section">
        <view className="section__header">
          <text className="section__title">备注</text>
        </view>
        <Input
          className="remark-input"
          value={remark}
          onChange={setRemark}
          placeholder="特殊要求、过敏信息等（选填）"
          maxlength={100}
        />
      </view>

      {/* 提交按钮 */}
      <view className="submit-section">
        <Button
          type="primary"
          size="large"
          block
          loading={isSubmitting}
          onClick={handleSubmit}
        >
          确认预约
        </Button>
      </view>
    </view>
  );
};

export default ReservationNew;
