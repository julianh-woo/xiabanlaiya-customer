import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import Taro from '@tarojs/taro';
import { PricingConfig, isFixedPricing, isWeightPricing } from '@/shared/types/product';

export interface SelectedOption {
  name: string;
  value: string;
  price: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  pricingType: 'fixed' | 'weight' | 'custom';
  quantity: number;
  weight?: number;
  selectedOptions?: SelectedOption[];
  unitPrice: number;
  totalPrice: number;
  specs?: Record<string, string | number>;
  pricingSnapshot: PricingConfig;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateWeight: (id: string, weight: number) => void;
  clear: () => void;
  getTotal: () => { count: number; amount: number };
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'cart_items';

function generateId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function calculateTotalPrice(item: Omit<CartItem, 'id'>): number {
  if (isFixedPricing(item.pricingSnapshot)) {
    return item.unitPrice * item.quantity;
  }
  if (isWeightPricing(item.pricingSnapshot)) {
    return item.unitPrice * (item.weight || item.pricingSnapshot.minWeight);
  }
  // custom pricing
  let price = item.unitPrice;
  if (item.selectedOptions) {
    item.selectedOptions.forEach(opt => {
      price += opt.price;
    });
  }
  return price * item.quantity;
}

function loadFromStorage(): CartItem[] {
  try {
    const data = Taro.getStorageSync(STORAGE_KEY);
    if (data && Array.isArray(data)) {
      return data as CartItem[];
    }
  } catch (e) {
    console.error('Failed to load cart from storage:', e);
  }
  return [];
}

function saveToStorage(items: CartItem[]): void {
  try {
    Taro.setStorageSync(STORAGE_KEY, items);
  } catch (e) {
    console.error('Failed to save cart to storage:', e);
  }
}

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);

  // 初始化时从 storage 加载
  useEffect(() => {
    const savedItems = loadFromStorage();
    if (savedItems.length > 0) {
      setItems(savedItems);
    }
  }, []);

  // 每次 items 变化时保存到 storage
  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    const newItem: CartItem = {
      ...item,
      id: generateId(),
      totalPrice: calculateTotalPrice(item),
    };

    setItems(prev => {
      // 检查是否有完全相同的商品（fixed类型且无规格）
      if (item.pricingType === 'fixed' && !item.specs && !item.selectedOptions) {
        const existingIndex = prev.findIndex(
          i => i.productId === item.productId &&
               i.pricingType === item.pricingType &&
               !i.specs &&
               (!i.selectedOptions || i.selectedOptions.length === 0)
        );
        if (existingIndex !== -1) {
          const updated = [...prev];
          const existing = updated[existingIndex];
          const newQuantity = existing.quantity + item.quantity;
          updated[existingIndex] = {
            ...existing,
            quantity: newQuantity,
            totalPrice: existing.unitPrice * newQuantity,
          };
          return updated;
        }
      }

      // 检查是否有相同规格的商品（weight/custom类型）
      if (item.specs || (item.selectedOptions && item.selectedOptions.length > 0)) {
        const specsMatch = (a: CartItem, b: Omit<CartItem, 'id'>) => {
          if (!a.specs && !b.specs) return true;
          if (!a.specs || !b.specs) return false;
          return JSON.stringify(a.specs) === JSON.stringify(b.specs);
        };

        const optionsMatch = (a: CartItem, b: Omit<CartItem, 'id'>) => {
          const aOpts = a.selectedOptions || [];
          const bOpts = b.selectedOptions || [];
          if (aOpts.length !== bOpts.length) return false;
          const sortedA = [...aOpts].sort((x, y) => x.name.localeCompare(y.name));
          const sortedB = [...bOpts].sort((x, y) => x.name.localeCompare(y.name));
          return sortedA.every((opt, i) => opt.name === sortedB[i].name && opt.value === sortedB[i].value);
        };

        const existingIndex = prev.findIndex(
          i => i.productId === item.productId &&
               i.pricingType === item.pricingType &&
               specsMatch(i, item) &&
               optionsMatch(i, item)
        );
        if (existingIndex !== -1) {
          const updated = [...prev];
          const existing = updated[existingIndex];
          let newQuantity = existing.quantity + item.quantity;
          let newWeight = existing.weight;
          if (item.pricingType === 'weight' && item.weight) {
            newWeight = (existing.weight || 0) + item.weight;
          }
          updated[existingIndex] = {
            ...existing,
            quantity: newQuantity,
            weight: newWeight,
            totalPrice: calculateTotalPrice({
              ...item,
              quantity: newQuantity,
              weight: newWeight,
            }),
          };
          return updated;
        }
      }

      return [...prev, newItem];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.id !== id));
      return;
    }
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantity,
          totalPrice: item.unitPrice * quantity,
        };
      }
      return item;
    }));
  }, []);

  const updateWeight = useCallback((id: string, weight: number) => {
    if (weight <= 0) {
      setItems(prev => prev.filter(item => item.id !== id));
      return;
    }
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          weight,
          totalPrice: item.unitPrice * weight,
        };
      }
      return item;
    }));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    const count = items.reduce((sum, item) => {
      if (item.pricingType === 'weight') {
        return sum + (item.weight || 0);
      }
      return sum + item.quantity;
    }, 0);
    const amount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    return { count: Math.round(count * 100) / 100, amount };
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.length;
  }, [items]);

  const value = useMemo(() => ({
    items,
    addItem,
    removeItem,
    updateQuantity,
    updateWeight,
    clear,
    getTotal,
    getItemCount,
  }), [items, addItem, removeItem, updateQuantity, updateWeight, clear, getTotal, getItemCount]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;
