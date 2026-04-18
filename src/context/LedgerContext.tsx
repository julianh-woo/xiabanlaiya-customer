import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import Taro from '@tarojs/taro';
import { CustomerLedger, LedgerEntry } from '@/shared/types/ledger';
import { get as getRequest, post as postRequest } from '@/network/request';

interface LedgerEntryDisplay {
  id: string;
  type: 'charge' | 'payment';
  amount: number;
  description: string;
  date: string;
  balanceAfter: number;
}

interface LedgerContextType {
  ledger: CustomerLedger | null;
  entries: LedgerEntryDisplay[];
  balance: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  charge: (amount: number, description?: string) => Promise<boolean>;
  pay: (orderId: string, amount: number) => Promise<boolean>;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

const LEDGER_STORAGE_KEY = 'customer_ledger';
const ENTRIES_STORAGE_KEY = 'ledger_entries';

function loadLedgerFromStorage(): CustomerLedger | null {
  try {
    const data = Taro.getStorageSync(LEDGER_STORAGE_KEY);
    if (data) {
      return data as CustomerLedger;
    }
  } catch (e) {
    console.error('Failed to load ledger from storage:', e);
  }
  return null;
}

function loadEntriesFromStorage(): LedgerEntryDisplay[] {
  try {
    const data = Taro.getStorageSync(ENTRIES_STORAGE_KEY);
    if (data && Array.isArray(data)) {
      return data as LedgerEntryDisplay[];
    }
  } catch (e) {
    console.error('Failed to load entries from storage:', e);
  }
  return [];
}

function saveLedgerToStorage(ledger: CustomerLedger | null): void {
  try {
    if (ledger) {
      Taro.setStorageSync(LEDGER_STORAGE_KEY, ledger);
    } else {
      Taro.removeStorageSync(LEDGER_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to save ledger to storage:', e);
  }
}

function saveEntriesToStorage(entries: LedgerEntryDisplay[]): void {
  try {
    Taro.setStorageSync(ENTRIES_STORAGE_KEY, entries);
  } catch (e) {
    console.error('Failed to save entries to storage:', e);
  }
}

interface LedgerProviderProps {
  children: ReactNode;
}

export function LedgerProvider({ children }: LedgerProviderProps) {
  const [ledger, setLedger] = useState<CustomerLedger | null>(null);
  const [entries, setEntries] = useState<LedgerEntryDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 初始化时从 storage 加载
  useEffect(() => {
    const savedLedger = loadLedgerFromStorage();
    const savedEntries = loadEntriesFromStorage();
    if (savedLedger) {
      setLedger(savedLedger);
    }
    if (savedEntries.length > 0) {
      setEntries(savedEntries);
    }
  }, []);

  // Mock 数据（当API不可用时）
  const getMockLedger = (): CustomerLedger => ({
    id: 'mock_ledger_001',
    tenantId: 'tenant_001',
    customerId: 'customer_001',
    customerName: '顾客',
    totalCharged: 1000,
    totalPaid: 350,
    balance: 650,
    lastTransactionAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const getMockEntries = (): LedgerEntryDisplay[] => [
    {
      id: 'entry_001',
      type: 'charge',
      amount: 500,
      description: '充值',
      date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      balanceAfter: 500,
    },
    {
      id: 'entry_002',
      type: 'payment',
      amount: 50,
      description: '订单消费',
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      balanceAfter: 450,
    },
    {
      id: 'entry_003',
      type: 'charge',
      amount: 500,
      description: '充值',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      balanceAfter: 950,
    },
    {
      id: 'entry_004',
      type: 'payment',
      amount: 300,
      description: '订单消费',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      balanceAfter: 650,
    },
  ];

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const customerId = Taro.getStorageSync('customer_id');
      if (!customerId) {
        // 使用 mock 数据
        const mockLedger = getMockLedger();
        const mockEntries = getMockEntries();
        setLedger(mockLedger);
        setEntries(mockEntries);
        saveLedgerToStorage(mockLedger);
        saveEntriesToStorage(mockEntries);
        return;
      }

      const response = await getRequest<CustomerLedger>(`/ledger/customer/${customerId}`);
      if (response && response.data) {
        const ledgerData = response.data;
        setLedger(ledgerData);
        saveLedgerToStorage(ledgerData);
      }
    } catch (error) {
      console.error('Failed to fetch ledger:', error);
      // 使用 mock 数据
      const mockLedger = getMockLedger();
      const mockEntries = getMockEntries();
      setLedger(mockLedger);
      setEntries(mockEntries);
      saveLedgerToStorage(mockLedger);
      saveEntriesToStorage(mockEntries);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const charge = useCallback(async (amount: number, description?: string): Promise<boolean> => {
    if (amount <= 0) return false;

    try {
      const customerId = Taro.getStorageSync('customer_id');
      if (!customerId) {
        // 本地模拟充值
        setLedger(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            totalCharged: prev.totalCharged + amount,
            balance: prev.balance + amount,
            lastTransactionAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          saveLedgerToStorage(updated);
          return updated;
        });

        const newEntry: LedgerEntryDisplay = {
          id: `entry_${Date.now()}`,
          type: 'charge',
          amount,
          description: description || '充值',
          date: new Date().toISOString(),
          balanceAfter: (ledger?.balance || 0) + amount,
        };
        setEntries(prev => [newEntry, ...prev]);
        saveEntriesToStorage([newEntry, ...entries]);

        Taro.showToast({ title: '充值成功', icon: 'success' });
        return true;
      }

      const response = await postRequest<{ success: boolean; ledger: CustomerLedger; entry: LedgerEntry }>(
        '/ledger/charge',
        { customerId, amount, description }
      );

      if (response && response.data) {
        setLedger(response.data.ledger);
        saveLedgerToStorage(response.data.ledger);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to charge:', error);
      Taro.showToast({ title: '充值失败', icon: 'none' });
      return false;
    }
  }, [ledger, entries]);

  const pay = useCallback(async (orderId: string, amount: number): Promise<boolean> => {
    if (amount <= 0) return false;

    try {
      const customerId = Taro.getStorageSync('customer_id');
      if (!customerId) {
        // 本地模拟扣款
        setLedger(prev => {
          if (!prev || prev.balance < amount) {
            Taro.showToast({ title: '余额不足', icon: 'none' });
            return prev;
          }
          const updated = {
            ...prev,
            totalPaid: prev.totalPaid + amount,
            balance: prev.balance - amount,
            lastTransactionAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          saveLedgerToStorage(updated);
          return updated;
        });

        const newEntry: LedgerEntryDisplay = {
          id: `entry_${Date.now()}`,
          type: 'payment',
          amount,
          description: `订单消费 #${orderId.slice(-6)}`,
          date: new Date().toISOString(),
          balanceAfter: (ledger?.balance || 0) - amount,
        };
        setEntries(prev => [newEntry, ...prev]);
        saveEntriesToStorage([newEntry, ...entries]);

        return true;
      }

      const response = await postRequest<{ success: boolean; ledger: CustomerLedger; entry: LedgerEntry }>(
        '/ledger/pay',
        { customerId, orderId, amount }
      );

      if (response && response.data) {
        setLedger(response.data.ledger);
        saveLedgerToStorage(response.data.ledger);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to pay:', error);
      return false;
    }
  }, [ledger, entries]);

  const balance = ledger?.balance || 0;

  const value = useMemo(() => ({
    ledger,
    entries,
    balance,
    isLoading,
    refresh,
    charge,
    pay,
  }), [ledger, entries, balance, isLoading, refresh, charge, pay]);

  return (
    <LedgerContext.Provider value={value}>
      {children}
    </LedgerContext.Provider>
  );
}

export function useLedger(): LedgerContextType {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
}

export default LedgerContext;
