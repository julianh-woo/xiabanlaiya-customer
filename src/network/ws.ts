import Taro from '@tarojs/taro';
import { getAuthToken } from './request';

export type WSEventType = 'new_order' | 'order_update' | 'inventory_update' | 'reservation_update';

export interface WSMessage {
  type: WSEventType;
  data: unknown;
  timestamp: string;
}

export interface OrderUpdateData {
  orderId: string;
  status: string;
  tenantId: string;
}

export interface InventoryUpdateData {
  productId: string;
  date: string;
  remaining: number;
  tenantId: string;
}

export interface ReservationUpdateData {
  reservationId: string;
  status: string;
  tenantId: string;
}

type MessageHandler = (data: unknown) => void;

const WS_URL = 'wss://cozejifen.haiei.cn/events';

interface WebSocketOptions {
  url?: string;
  heartbeatInterval?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

const defaultOptions: Required<WebSocketOptions> = {
  url: WS_URL,
  heartbeatInterval: 30000,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
};

class WSClient {
  private socket: Taro.SocketTask | null = null;
  private url: string;
  private options: Required<WebSocketOptions>;
  private eventHandlers: Map<WSEventType, Set<MessageHandler>> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private isConnected = false;
  private isManualClose = false;
  private messageQueue: string[] = [];

  constructor(options: WebSocketOptions = {}) {
    this.options = { ...defaultOptions, ...options };
    this.url = this.options.url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.socket) {
        resolve();
        return;
      }

      const token = getAuthToken();
      const header: Record<string, string> = {};
      if (token) {
        header['Authorization'] = `Bearer ${token}`;
      }

      this.socket = Taro.connectSocket({
        url: this.url,
        header,
        success: () => {
          this.setupEventListeners();
          resolve();
        },
        fail: (err) => {
          console.error('WebSocket connect failed:', err);
          reject(err);
        },
      });
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.onOpen(() => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushMessageQueue();
    });

    this.socket.onClose((res) => {
      console.log('WebSocket closed:', res);
      this.isConnected = false;
      this.stopHeartbeat();

      if (!this.isManualClose) {
        this.scheduleReconnect();
      }
    });

    this.socket.onError((err) => {
      console.error('WebSocket error:', err);
    });

    this.socket.onMessage((res) => {
      try {
        const message: WSMessage = typeof res.data === 'string' 
          ? JSON.parse(res.data) 
          : res.data;
        this.handleMessage(message);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    });
  }

  private handleMessage(message: WSMessage): void {
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data);
        } catch (e) {
          console.error(`Error in handler for ${message.type}:`, e);
        }
      });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send('ping', { timestamp: Date.now() });
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // reconnect will be scheduled again by onClose
      });
    }, this.options.reconnectInterval * this.reconnectAttempts);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (msg && this.socket) {
        this.socket.send({ data: msg });
      }
    }
  }

  disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close({
        success: () => {
          console.log('WebSocket closed manually');
        },
        fail: (err) => {
          console.error('Failed to close WebSocket:', err);
        },
      });
      this.socket = null;
    }

    this.isConnected = false;
    this.messageQueue = [];
  }

  send(event: string, data?: unknown): void {
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

    if (this.isConnected && this.socket) {
      this.socket.send({
        data: message,
        fail: (err) => {
          console.error('Failed to send message:', err);
          this.messageQueue.push(message);
        },
      });
    } else {
      this.messageQueue.push(message);
    }
  }

  on(event: WSEventType, handler: MessageHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  off(event: WSEventType, handler?: MessageHandler): void {
    if (handler) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    } else {
      this.eventHandlers.delete(event);
    }
  }

  joinRoom(room: string): void {
    this.send('join_room', { room });
  }

  leaveRoom(room: string): void {
    this.send('leave_room', { room });
  }

  joinCustomerRoom(customerId: string): void {
    this.joinRoom(`customer:${customerId}`);
  }

  leaveCustomerRoom(customerId: string): void {
    this.leaveRoom(`customer:${customerId}`);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// 单例
let wsClient: WSClient | null = null;

export function getWSClient(options?: WebSocketOptions): WSClient {
  if (!wsClient) {
    wsClient = new WSClient(options);
  }
  return wsClient;
}

export function createWSClient(options?: WebSocketOptions): WSClient {
  if (wsClient) {
    wsClient.disconnect();
  }
  wsClient = new WSClient(options);
  return wsClient;
}

export function disconnectWS(): void {
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
}

// 便捷方法：监听订单更新
export function onOrderUpdate(handler: (data: OrderUpdateData) => void): () => void {
  const client = getWSClient();
  return client.on('order_update', handler as MessageHandler);
}

// 便捷方法：监听新订单（商户端）
export function onNewOrder(handler: (data: OrderUpdateData) => void): () => void {
  const client = getWSClient();
  return client.on('new_order', handler as MessageHandler);
}

// 便捷方法：监听库存更新
export function onInventoryUpdate(handler: (data: InventoryUpdateData) => void): () => void {
  const client = getWSClient();
  return client.on('inventory_update', handler as MessageHandler);
}

// 便捷方法：监听预约更新
export function onReservationUpdate(handler: (data: ReservationUpdateData) => void): () => void {
  const client = getWSClient();
  return client.on('reservation_update', handler as MessageHandler);
}

export default {
  getWSClient,
  createWSClient,
  disconnectWS,
  onOrderUpdate,
  onNewOrder,
  onInventoryUpdate,
  onReservationUpdate,
};
