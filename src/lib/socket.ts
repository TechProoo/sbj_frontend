import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';

/// The gateway lives on the server root, not under the /api prefix.
const REALTIME_URL = `${API_URL.replace(/\/api\/?$/, '')}/realtime`;

let socket: Socket | null = null;

/// One shared connection for the tab. Customers connect anonymously and can
/// only subscribe to an order id they already hold.
export function getSocket(): Socket {
  if (!socket) {
    socket = io(REALTIME_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

/// Subscribes to one order and returns an unsubscribe function. `onUpdate`
/// fires for any change to that order.
export function watchOrder(
  orderId: string,
  onUpdate: (payload: {
    id: string;
    status?: string;
    paymentStatus?: string;
  }) => void,
): () => void {
  const active = getSocket();

  const join = () => active.emit('subscribe:order', { orderId });
  join();
  active.on('connect', join);

  const events = [
    'order:updated',
    'order:status-changed',
    'order:cancelled',
    'order:item-status-changed',
  ];
  for (const event of events) active.on(event, onUpdate);

  return () => {
    active.emit('unsubscribe:order', { orderId });
    active.off('connect', join);
    for (const event of events) active.off(event, onUpdate);
  };
}
