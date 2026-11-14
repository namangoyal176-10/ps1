import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinTeam: (teamId: string) => void;
  leaveTeam: (teamId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const socketInstance = io(window.location.origin, {
      auth: { token: token || undefined },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      socketInstance.emit('join_discovery');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    // Global listener to invalidate relevant queries when real-time updates happen
    socketInstance.on('team_created', () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    });

    socketInstance.on('team_updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ['team', data.id] });
      }
    });

    socketInstance.on('team_deleted', (data) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      if (data?.teamId) {
        queryClient.invalidateQueries({ queryKey: ['team', data.teamId] });
      }
    });

    socketInstance.on('member_joined', (data) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      if (data?.teamId) {
        queryClient.invalidateQueries({ queryKey: ['team', data.teamId] });
      }
      queryClient.invalidateQueries({ queryKey: ['me'] });
    });

    socketInstance.on('member_left', (data) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      if (data?.teamId) {
        queryClient.invalidateQueries({ queryKey: ['team', data.teamId] });
      }
      queryClient.invalidateQueries({ queryKey: ['me'] });
    });

    socketInstance.on('join_request_received', () => {
      queryClient.invalidateQueries({ queryKey: ['join_requests'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
    });

    socketInstance.on('join_request_status', () => {
      queryClient.invalidateQueries({ queryKey: ['join_requests'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, queryClient]);

  const joinTeam = (teamId: string) => {
    if (socket && teamId) {
      socket.emit('join_team', teamId);
    }
  };

  const leaveTeam = (teamId: string) => {
    if (socket && teamId) {
      socket.emit('leave_team', teamId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, joinTeam, leaveTeam }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
