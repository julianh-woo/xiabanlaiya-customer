import React, { ReactNode, CSSProperties } from 'react';
import Taro from '@tarojs/taro';
import './index.scss';

// ==================== Button ====================
interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'primary' | 'default' | 'warning' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  plain?: boolean;
  round?: boolean;
  circle?: boolean;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  className?: string;
  style?: CSSProperties;
  openType?: Taro.button.props.OpenType;
  hoverClass?: string;
  hoverStartTime?: number;
  hoverStayTime?: number;
  lang?: string;
  sessionFrom?: string;
  sendMessageTitle?: string;
  sendMessagePath?: string;
  sendMessageImg?: string;
  showMessageCard?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'default',
  size = 'medium',
  plain = false,
  round = false,
  circle = false,
  disabled = false,
  loading = false,
  block = false,
  className = '',
  style,
  ...props
}) => {
  const handleClick = (e: Taro.TouchEvent) => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  const classes = [
    'ui-button',
    `ui-button--${type}`,
    `ui-button--${size}`,
    plain ? 'ui-button--plain' : '',
    round ? 'ui-button--round' : '',
    circle ? 'ui-button--circle' : '',
    disabled ? 'ui-button--disabled' : '',
    loading ? 'ui-button--loading' : '',
    block ? 'ui-button--block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      onClick={handleClick}
      disabled={disabled || loading}
      hoverClass={disabled ? '' : 'ui-button--hover'}
      style={style}
      {...props}
    >
      {loading && <span className="ui-button__loading" />}
      <span className="ui-button__text">{children}</span>
    </button>
  );
};

// ==================== Input ====================
interface InputProps {
  value?: string;
  onChange?: (value: string) => void;
  onInput?: (e: Taro.BaseEventOrig<{ value: string }>) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  onConfirm?: () => void;
  type?: 'text' | 'number' | 'idcard' | 'digit' | 'phone';
  password?: boolean;
  placeholder?: string;
  placeholderClass?: string;
  disabled?: boolean;
  maxlength?: number;
  cursor?: number;
  selectionStart?: number;
  selectionEnd?: number;
  adjustPosition?: boolean;
  className?: string;
  style?: CSSProperties;
  confirmType?: 'send' | 'search' | 'next' | 'go' | 'done';
  alwaysEmbed?: boolean;
}

export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  onInput,
  onBlur,
  onFocus,
  onConfirm,
  type = 'text',
  placeholder,
  disabled = false,
  maxlength = 140,
  className = '',
  style,
  confirmType,
  ...props
}) => {
  const handleInput = (e: Taro.BaseEventOrig<{ value: string; cursor?: number }>) => {
    onChange?.(e.detail.value);
    onInput?.(e as Taro.BaseEventOrig<{ value: string }>);
  };

  return (
    <input
      className={`ui-input ${className}`}
      type={type}
      value={value}
      placeholder={placeholder}
      placeholderClass="ui-input--placeholder"
      disabled={disabled}
      maxlength={maxlength}
      onInput={handleInput}
      onBlur={onBlur}
      onFocus={onFocus}
      onConfirm={onConfirm}
      confirmType={confirmType}
      style={style}
      {...props}
    />
  );
};

// ==================== Card ====================
interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  style,
  onClick,
  hover = false,
}) => {
  return (
    <view
      className={`ui-card ${hover ? 'ui-card--hover' : ''} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </view>
  );
};

// ==================== Badge ====================
interface BadgeProps {
  children?: ReactNode;
  count?: number;
  maxCount?: number;
  dot?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  count,
  maxCount = 99,
  dot = false,
  className = '',
  style,
}) => {
  if (dot) {
    return (
      <view className={`ui-badge ${className}`} style={style}>
        <span className="ui-badge__dot" />
        {children}
      </view>
    );
  }

  if (count === undefined) {
    return (
      <view className={`ui-badge ${className}`} style={style}>
        {children}
      </view>
    );
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <view className={`ui-badge ${className}`} style={style}>
      {children}
      <span className={`ui-badge__count ${count === 0 ? 'ui-badge__count--hidden' : ''}`}>
        {displayCount}
      </span>
    </view>
  );
};

// ==================== Empty ====================
interface EmptyProps {
  text?: string;
  image?: string;
  className?: string;
  style?: CSSProperties;
}

export const Empty: React.FC<EmptyProps> = ({
  text = '暂无数据',
  image,
  className = '',
  style,
}) => {
  return (
    <view className={`ui-empty ${className}`} style={style}>
      {image ? (
        <image className="ui-empty__image" src={image} mode="aspectFit" />
      ) : (
        <view className="ui-empty__icon">
          <text>📦</text>
        </view>
      )}
      <text className="ui-empty__text">{text}</text>
    </view>
  );
};

// ==================== Loading ====================
interface LoadingProps {
  text?: string;
  type?: 'spinner' | 'circular';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export const Loading: React.FC<LoadingProps> = ({
  text,
  type = 'spinner',
  size = 'medium',
  color = 'var(--primary-color)',
  className = '',
  style,
}) => {
  return (
    <view className={`ui-loading ${className}`} style={style}>
      <view
        className={`ui-loading__${type} ui-loading__${type}--${size}`}
        style={type === 'circular' ? { borderColor: color } : { color }}
      />
      {text && <text className="ui-loading__text">{text}</text>}
    </view>
  );
};

// ==================== Toast ====================
interface ToastOptions {
  title: string;
  icon?: 'success' | 'loading' | 'none' | 'error';
  image?: string;
  duration?: number;
  mask?: boolean;
}

export const Toast = {
  show: (options: ToastOptions | string) => {
    const opts: ToastOptions = typeof options === 'string' ? { title: options } : options;
    Taro.showToast({
      title: opts.title,
      icon: opts.icon || 'none',
      image: opts.image,
      duration: opts.duration || 2000,
      mask: opts.mask || false,
    });
  },
  success: (title: string, duration?: number) => {
    Taro.showToast({ title, icon: 'success', duration: duration || 2000 });
  },
  fail: (title: string, duration?: number) => {
    Taro.showToast({ title, icon: 'error', duration: duration || 2000 });
  },
  loading: (title?: string) => {
    Taro.showLoading({ title: title || '加载中...', mask: true });
  },
  hide: () => {
    Taro.hideLoading();
    Taro.hideToast();
  },
};

// ==================== Dialog ====================
interface DialogOptions {
  title?: string;
  message?: string;
  showCancel?: boolean;
  cancelText?: string;
  cancelColor?: string;
  confirmText?: string;
  confirmColor?: string;
}

export const Dialog = {
  alert: (options: DialogOptions): Promise<void> => {
    return new Promise((resolve) => {
      Taro.showModal({
        title: options.title || '',
        content: options.message || '',
        showCancel: false,
        confirmText: options.confirmText || '确定',
        confirmColor: options.confirmColor || '#FF6B00',
        success: () => resolve(),
      });
    });
  },
  confirm: (options: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      Taro.showModal({
        title: options.title || '',
        content: options.message || '',
        showCancel: options.showCancel !== false,
        cancelText: options.cancelText || '取消',
        cancelColor: options.cancelColor || '#999999',
        confirmText: options.confirmText || '确定',
        confirmColor: options.confirmColor || '#FF6B00',
        success: (res) => {
          resolve(res.confirm);
        },
      });
    });
  },
};

// ==================== Price ====================
interface PriceProps {
  value: number;
  size?: 'small' | 'medium' | 'large';
  decimal?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const Price: React.FC<PriceProps> = ({
  value,
  size = 'medium',
  decimal = true,
  className = '',
  style,
}) => {
  const [integer, decimalPart] = value.toFixed(2).split('.');

  return (
    <view className={`ui-price ui-price--${size} ${className}`} style={style}>
      <text className="ui-price__symbol">¥</text>
      <text className="ui-price__integer">{integer}</text>
      {decimal && <text className="ui-price__decimal">.{decimalPart}</text>}
    </view>
  );
};

// ==================== Tag ====================
interface TagProps {
  children: ReactNode;
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'small' | 'medium';
  plain?: boolean;
  round?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const Tag: React.FC<TagProps> = ({
  children,
  type = 'primary',
  size = 'medium',
  plain = false,
  round = false,
  className = '',
  style,
}) => {
  const classes = [
    'ui-tag',
    `ui-tag--${type}`,
    `ui-tag--${size}`,
    plain ? 'ui-tag--plain' : '',
    round ? 'ui-tag--round' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} style={style}>
      {children}
    </span>
  );
};

// ==================== Divider ====================
interface DividerProps {
  className?: string;
  style?: CSSProperties;
}

export const Divider: React.FC<DividerProps> = ({ className = '', style }) => {
  return <view className={`ui-divider ${className}`} style={style} />;
};

// ==================== SafeArea ====================
interface SafeAreaProps {
  position?: 'top' | 'bottom' | 'both';
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const SafeArea: React.FC<SafeAreaProps> = ({
  position = 'bottom',
  children,
  className = '',
  style,
}) => {
  const classes = [
    'ui-safe-area',
    position === 'top' ? 'ui-safe-area--top' : '',
    position === 'bottom' ? 'ui-safe-area--bottom' : '',
    position === 'both' ? 'ui-safe-area--both' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <view className={classes} style={style}>
      {children}
    </view>
  );
};

// 导出所有组件
export default {
  Button,
  Input,
  Card,
  Badge,
  Empty,
  Loading,
  Toast,
  Dialog,
  Price,
  Tag,
  Divider,
  SafeArea,
};
