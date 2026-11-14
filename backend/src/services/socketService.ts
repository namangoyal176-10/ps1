import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

let ioInstance: SocketIOServer | null = null;

export function initSocket(io: SocketIOServer) {
  ioInstance = io;

  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token;

      if (token && typeof token === 'string') {
        const payload = verifyToken(token);
        (socket as any).user = payload;
      }
      next();
    } catch (err) {
      // Allow unauthenticated connection for public discovery board
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    if (user?.userId) {
      socket.join(`user:${user.userId}`);
      logger.info(`User ${user.userId} joined user room`);
    }

    socket.on('join_team', (teamId: string) => {
      if (teamId) {
        socket.join(`team:${teamId}`);
        logger.debug(`Socket ${socket.id} joined team:${teamId}`);
      }
    });

    socket.on('leave_team', (teamId: string) => {
      if (teamId) {
        socket.leave(`team:${teamId}`);
        logger.debug(`Socket ${socket.id} left team:${teamId}`);
      }
    });

    socket.on('join_discovery', () => {
      socket.join('discovery');
    });

    socket.on('leave_discovery', () => {
      socket.leave('discovery');
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

export function emitToTeam(teamId: string, event: string, data: any) {
  if (ioInstance) {
    ioInstance.to(`team:${teamId}`).emit(event, data);
  }
}

export function emitToUser(userId: string, event: string, data: any) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToDiscovery(event: string, data: any) {
  if (ioInstance) {
    ioInstance.to('discovery').emit(event, data);
  }
}
