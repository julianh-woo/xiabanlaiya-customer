import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { 
  Product, 
  PricingConfig, 
  FixedPricing, 
  WeightPricing, 
  CustomPricing, 
  isFixedPricing, 
  isWeightPricing, 
  isCustomPricing,
  CustomOptionItem 
} from '@/shared/types/product';
import { Button, Price } from '@/components/ui';
import { SelectedOption } from '@/context/CartContext';
import { roundPrice, roundWeight } from '@/shared/lib/utils';
import './index.scss';

interface SpecSelectorProps {
  product: Product;
  visible: boolean;
  onClose: () => void;
  onAdd: (item: {
    productId: string;
    productName: string;
    productImage?: string;
    pricingType: Product['pricingType'];
    quantity: number;
    weight?: number;
    selectedOptions?: SelectedOption[];
    unitPrice: number;
    specs?: Record<string, string | number>;
    pricingSnapshot: PricingConfig;
  }) => void;
}

const SpecSelector: React.FC<SpecSelectorProps> = ({
  product,
  visible,
  onClose,
  onAdd,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentPrice, setCurrentPrice] = useState(0);

  // 获取计价配置
  const config = product.pricingConfig;

  // 初始化
  useEffect(() => {
    if (visible) {
      setQuantity(1);
      setSelectedOptions({});

      if (isWeightPricing(config)) {
        // 称重类型：初始化为最小重量
        setWeight(config.minWeight);
        setCurrentPrice(config.pricePerJin * config.minWeight);
      } else if (isCustomPricing(config)) {
        // 自定义类型：设置默认值
        const defaults: Record<string, string> = {};
        config.options.forEach(opt => {
          if (opt.required && opt.items.length > 0) {
            defaults[opt.name] = opt.items[0].name;
          }
        });
        setSelectedOptions(defaults);
      } else {
        // 固定价格
        setCurrentPrice(config.price);
      }
    }
  }, [visible, product.id]);

  // 计算价格
  useEffect(() => {
    calculatePrice();
  }, [quantity, weight, selectedOptions, config]);

  /**
   * 计算当前价格
   */
  const calculatePrice = () => {
    if (isFixedPricing(config)) {
      setCurrentPrice(config.price * quantity);
    } else if (isWeightPricing(config)) {
      const validWeight = Math.max(weight, config.minWeight);
      const roundedWeight = roundWeight(validWeight, config.stepWeight);
      setCurrentPrice(roundPrice(config.pricePerJin * roundedWeight));
    } else if (isCustomPricing(config)) {
      let basePrice = 0;
      config.options.forEach(opt => {
        const selectedValue = selectedOptions[opt.name];
        if (selectedValue) {
          const item = opt.items.find(i => i.name === selectedValue);
          if (item) {
            basePrice += item.price;
          }
        }
      });
      setCurrentPrice(basePrice * quantity);
    }
  };

  /**
   * 处理选项选择
   */
  const handleOptionSelect = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value,
    }));
  };

  /**
   * 调整重量
   */
  const adjustWeight = (delta: number) => {
    if (!isWeightPricing(config)) return;

    const newWeight = Math.max(
      config.minWeight,
      roundWeight(weight + delta, config.stepWeight)
    );
    setWeight(newWeight);
  };

  /**
   * 直接输入重量
   */
  const handleWeightInput = (e: Taro.TouchEvent) => {
    const value = parseFloat(e.detail.value);
    if (!isNaN(value) && value >= config.minWeight) {
      setWeight(roundWeight(value, config.stepWeight));
    }
  };

  /**
   * 检查是否可以添加
   */
  const canAdd = (): boolean => {
    if (isCustomPricing(config)) {
      return config.options.every(opt => {
        if (!opt.required) return true;
        return !!selectedOptions[opt.name];
      });
    }
    if (isWeightPricing(config)) {
      return weight >= config.minWeight;
    }
    return true;
  };

  /**
   * 处理添加按钮点击
   */
  const handleAdd = () => {
    if (!canAdd()) {
      Taro.showToast({ title: '请完善规格选择', icon: 'none' });
      return;
    }

    let unitPrice = 0;
    let options: SelectedOption[] | undefined;
    let specs: Record<string, string | number> | undefined;

    if (isFixedPricing(config)) {
      unitPrice = config.price;
    } else if (isWeightPricing(config)) {
      unitPrice = config.pricePerJin;
    } else if (isCustomPricing(config)) {
      options = [];
      specs = {};
      config.options.forEach(opt => {
        const selectedValue = selectedOptions[opt.name];
        if (selectedValue) {
          const item = opt.items.find(i => i.name === selectedValue);
          if (item) {
            unitPrice += item.price;
            options!.push({ name: opt.name, value: item.name, price: item.price });
            specs![opt.name] = item.name;
          }
        }
      });
    }

    onAdd({
      productId: product.id,
      productName: product.name,
      productImage: product.images?.[0]?.url,
      pricingType: product.pricingType,
      quantity,
      weight: isWeightPricing(config) ? weight : undefined,
      selectedOptions: options,
      unitPrice,
      specs,
      pricingSnapshot: config,
    });

    onClose();
  };

  if (!visible) return null;

  return (
    <>
      <view className="spec-selector-mask" onClick={onClose} />
      <view className="spec-selector">
        {/* 头部信息 */}
        <view className="spec-selector__header">
          <view className="spec-selector__product">
            <image
              className="spec-selector__image"
              src={product.images?.[0]?.url || '/assets/images/placeholder.png'}
              mode="aspectFill"
            />
            <view className="spec-selector__info">
              <text className="spec-selector__name">{product.name}</text>
              <text className="spec-selector__price">
                {isFixedPricing(config) && `¥${config.price}/${config.unit}`}
                {isWeightPricing(config) && `¥${config.pricePerJin}/斤`}
                {isCustomPricing(config) && '请选择规格'}
              </text>
            </view>
          </view>
          <view className="spec-selector__close" onClick={onClose}>
            <text>✕</text>
          </view>
        </view>

        {/* 内容区域 */}
        <view className="spec-selector__content">
          {/* 固定价格类型 - 数量选择 */}
          {isFixedPricing(config) && (
            <view className="spec-section">
              <view className="spec-section__label">
                <text>数量 ({config.unit})</text>
              </view>
              <view className="spec-section__stepper">
                <view
                  className="stepper-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <text>-</text>
                </view>
                <view className="stepper-value">
                  <text>{quantity}</text>
                </view>
                <view
                  className="stepper-btn"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <text>+</text>
                </view>
              </view>
            </view>
          )}

          {/* 称重类型 - 重量输入 */}
          {isWeightPricing(config) && (
            <view className="spec-section spec-section--weight">
              <view className="spec-section__label">
                <text>重量（斤）</text>
                <text className="spec-section__hint">最少 {config.minWeight} 斤</text>
              </view>

              <view className="spec-section__weight-controls">
                {/* 减量按钮 */}
                <view 
                  className="weight-adjust-btn"
                  onClick={() => adjustWeight(-config.stepWeight)}
                >
                  <text>-{config.stepWeight}</text>
                </view>

                {/* 重量显示/输入 */}
                <view className="weight-display">
                  <input
                    className="weight-input"
                    type="digit"
                    value={weight}
                    onInput={handleWeightInput}
                    placeholder={`最小${config.minWeight}`}
                  />
                  <text className="weight-unit">斤</text>
                </view>

                {/* 加量按钮 */}
                <view 
                  className="weight-adjust-btn"
                  onClick={() => adjustWeight(config.stepWeight)}
                >
                  <text>+{config.stepWeight}</text>
                </view>
              </view>

              {/* 快速选择 */}
              <view className="weight-presets">
                {[0.5, 1, 1.5, 2].map(w => (
                  <view
                    key={w}
                    className={`weight-preset ${weight === w ? 'weight-preset--active' : ''}`}
                    onClick={() => setWeight(w)}
                  >
                    <text>{w}斤</text>
                  </view>
                ))}
              </view>

              {/* 单价说明 */}
              <view className="spec-section__price-note">
                <text>单价 ¥{config.pricePerJin}/斤</text>
              </view>
            </view>
          )}

          {/* 自定义规格类型 */}
          {isCustomPricing(config) && (
            <view className="spec-section spec-section--custom">
              {config.options.map((option) => (
                <view key={option.name} className="option-group">
                  <view className="option-group__header">
                    <text className="option-group__name">{option.name}</text>
                    {option.required && (
                      <text className="option-group__required">必选</text>
                    )}
                    {!option.required && (
                      <text className="option-group__optional">可选</text>
                    )}
                  </view>
                  <view className="option-group__items">
                    {option.items.map((item) => (
                      <view
                        key={item.name}
                        className={`option-item ${
                          selectedOptions[option.name] === item.name 
                            ? 'option-item--selected' 
                            : ''
                        }`}
                        onClick={() => handleOptionSelect(option.name, item.name)}
                      >
                        <text className="option-item__name">{item.name}</text>
                        {item.price > 0 && (
                          <text className="option-item__price">+¥{item.price}</text>
                        )}
                        {item.price < 0 && (
                          <text className="option-item__price option-item__price--discount">
                            ¥{item.price}
                          </text>
                        )}
                      </view>
                    ))}
                  </view>
                </view>
              ))}

              {/* 数量选择 */}
              <view className="option-group option-group--quantity">
                <view className="option-group__header">
                  <text className="option-group__name">份数</text>
                </view>
                <view className="spec-section__stepper">
                  <view
                    className="stepper-btn"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <text>-</text>
                  </view>
                  <view className="stepper-value">
                    <text>{quantity}</text>
                  </view>
                  <view
                    className="stepper-btn"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <text>+</text>
                  </view>
                </view>
              </view>
            </view>
          )}
        </view>

        {/* 底部操作栏 */}
        <view className="spec-selector__footer">
          <view className="spec-selector__total">
            <text className="total-label">合计</text>
            <text className="total-price">¥{currentPrice.toFixed(2)}</text>
          </view>
          <Button
            type="primary"
            size="large"
            disabled={!canAdd()}
            onClick={handleAdd}
          >
            加入购物车
          </Button>
        </view>
      </view>
    </>
  );
};

export default SpecSelector;
