import React from 'react';
import './index.scss';

export type DeliveryMode = 'pickup' | 'local' | 'express';

interface DeliveryOption {
  value: DeliveryMode;
  label: string;
  icon: string;
  desc?: string;
  fee?: number;
}

const deliveryOptions: DeliveryOption[] = [
  {
    value: 'pickup',
    label: '自取',
    icon: '🏪',
    desc: '到店自取',
    fee: 0,
  },
  {
    value: 'local',
    label: '本地配送',
    icon: '🚚',
    desc: '送货上门',
    fee: 5,
  },
  {
    value: 'express',
    label: '快递',
    icon: '📦',
    desc: '全国可发',
    fee: 10,
  },
];

interface DeliveryModeSelectorProps {
  value: DeliveryMode;
  onChange: (mode: DeliveryMode) => void;
  showFee?: boolean;
  disabled?: boolean;
}

const DeliveryModeSelector: React.FC<DeliveryModeSelectorProps> = ({
  value,
  onChange,
  showFee = true,
  disabled = false,
}) => {
  return (
    <view className="delivery-mode-selector">
      {deliveryOptions.map(option => {
        const isSelected = value === option.value;
        return (
          <view
            key={option.value}
            className={`delivery-option ${isSelected ? 'delivery-option--selected' : ''} ${disabled ? 'delivery-option--disabled' : ''}`}
            onClick={() => !disabled && onChange(option.value)}
          >
            <view className="delivery-option__icon">
              <text>{option.icon}</text>
            </view>
            <view className="delivery-option__content">
              <text className="delivery-option__label">{option.label}</text>
              {option.desc && (
                <text className="delivery-option__desc">{option.desc}</text>
              )}
            </view>
            {showFee && (
              <view className="delivery-option__fee">
                {option.fee === 0 ? (
                  <text className="fee-free">免运费</text>
                ) : (
                  <text className="fee-text">+¥{option.fee}</text>
                )}
              </view>
            )}
            <view className="delivery-option__check">
              {isSelected && <text>✓</text>}
            </view>
          </view>
        );
      })}
    </view>
  );
};

export { DeliveryModeSelector, deliveryOptions };
export default DeliveryModeSelector;
