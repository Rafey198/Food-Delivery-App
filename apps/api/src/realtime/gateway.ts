import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { verifyAccessToken } from '../auth/jwt';

export type WSEvent =
  | { type: 'order-status-updated'; orderId: string; status: string; data?: unknown }
  | { type: 'courier-location-updated'; courierId: string; lat: number; lon: number }
  | { type: 'restaurant-order-received'; restaurantId: string; orderId: string }
  | { type: 'courier-offer-created'; courierId: string; orderId: string; data?: unknown }
  | { type: 'support-message-created'; ticketId: string; data?: unknown };

interface Socket {
  ws: WebSocket;
  userId: string;
  role: string;
  rooms: Set<string>;
}

class RealtimeGateway {
  private wss: WebSocketServer | null = null;
  private sockets = new Map<string, Set<Socket>>();

  attach(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url ?? '', 'http://x');
      const token = url.searchParams.get('token');
      if (!token) {
        ws.close(4401, 'Missing token');
        return;
      }
      let payload;
      try {
        payload = verifyAccessToken(token);
      } catch {
        ws.close(4401, 'Invalid token');
        return;
      }

      const socket: Socket = {
        ws,
        userId: payload.sub,
        role: payload.role,
        rooms: new Set([`user:${payload.sub}`, `role:${payload.role}`]),
      };
      this.add(socket);

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(String(raw));
          if (msg.type === 'subscribe' && typeof msg.room === 'string') {
            socket.rooms.add(msg.room);
            this.add(socket);
          }
          if (msg.type === 'unsubscribe' && typeof msg.room === 'string') {
            socket.rooms.delete(msg.room);
          }
        } catch {
          // ignore malformed
        }
      });

      ws.on('close', () => this.remove(socket));
      ws.send(JSON.stringify({ type: 'hello', userId: payload.sub, role: payload.role }));
    });
  }

  private add(socket: Socket) {
    for (const room of socket.rooms) {
      const set = this.sockets.get(room) ?? new Set();
      set.add(socket);
      this.sockets.set(room, set);
    }
  }

  private remove(socket: Socket) {
    for (const room of socket.rooms) {
      this.sockets.get(room)?.delete(socket);
    }
  }

  emit(room: string, event: WSEvent) {
    const set = this.sockets.get(room);
    if (!set) return;
    const payload = JSON.stringify(event);
    for (const s of set) {
      if (s.ws.readyState === WebSocket.OPEN) {
        s.ws.send(payload);
      }
    }
  }

  emitToUser(userId: string, event: WSEvent) {
    this.emit(`user:${userId}`, event);
  }

  emitToOrder(orderId: string, event: WSEvent) {
    this.emit(`order:${orderId}`, event);
  }

  emitToRestaurant(restaurantId: string, event: WSEvent) {
    this.emit(`restaurant:${restaurantId}`, event);
  }

  emitToRole(role: string, event: WSEvent) {
    this.emit(`role:${role}`, event);
  }
}

export const realtime = new RealtimeGateway();
