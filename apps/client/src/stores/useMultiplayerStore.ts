import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import {
  Card,
  CardColor,
  ChatMessage,
  ClientToServerEvents,
  PublicGameState,
  RoomDetails,
  RoomSettings,
  ServerToClientEvents,
} from '@uno-arena/shared';

const rawServerUrl = import.meta.env.VITE_SERVER_URL || '';
const SERVER_URL = rawServerUrl ? rawServerUrl.trim().replace(/\/$/, '') : '';

interface MultiplayerState {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  room: RoomDetails | null;
  playerId: string | null;
  reconnectToken: string | null;
  gameState: PublicGameState | null;
  myHand: Card[];
  errorToast: string | null;
  chatMessages: ChatMessage[];
  unreadChatCount: number;

  initSocket: () => void;
  retryConnection: () => void;
  createRoom: (playerName: string, avatar: string, settings?: Partial<RoomSettings>) => void;
  joinRoom: (roomCode: string, playerName: string, avatar: string) => void;
  reconnect: (roomId: string, playerId: string, token: string) => void;
  setReady: (isReady: boolean) => void;
  startGame: () => void;
  playCard: (cardId: string, chosenColor?: CardColor) => void;
  drawCard: () => void;
  playDrawnCard: (play: boolean, chosenColor?: CardColor) => void;
  chooseColor: (color: CardColor) => void;
  callUno: () => void;
  catchUno: (targetPlayerId: string) => void;
  challengeWd4: (challenge: boolean) => void;
  requestRematch: () => void;
  leaveRoom: () => void;
  addAiPlayer: (difficulty: 'easy' | 'medium' | 'hard') => void;
  removeAiPlayer: (playerId: string) => void;
  clearError: () => void;
  sendChat: (message: string) => void;
  clearUnreadChat: () => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  socket: null,
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  room: null,
  playerId: null,
  reconnectToken: null,
  gameState: null,
  myHand: [],
  errorToast: null,
  chatMessages: [],
  unreadChatCount: 0,

  initSocket: () => {
    if (get().socket) {
      if (!get().socket?.connected) {
        get().socket?.connect();
      }
      return;
    }

    set({ isConnecting: true, connectionError: null });
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL || undefined, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      set({ isConnected: true, isConnecting: false, connectionError: null });

      // Try automatic reconnect if saved session exists
      const savedSession = sessionStorage.getItem('uno_reconnect_session');
      if (savedSession) {
        try {
          const { roomId, playerId, reconnectToken } = JSON.parse(savedSession);
          if (roomId && playerId && reconnectToken) {
            socket.emit('reconnectRoom', { roomId, playerId, reconnectToken });
          }
        } catch {}
      }
    });

    socket.on('connect_error', (err) => {
      set({
        isConnected: false,
        isConnecting: false,
        connectionError: err.message || 'Unable to connect to game server',
      });
    });

    socket.on('disconnect', (reason) => {
      set({ isConnected: false });
    });

    socket.on('roomCreated', ({ room, reconnectToken, playerId }) => {
      sessionStorage.setItem(
        'uno_reconnect_session',
        JSON.stringify({ roomId: room.id, playerId, reconnectToken })
      );
      set({ room, reconnectToken, playerId, gameState: null, myHand: [] });
    });

    socket.on('roomJoined', ({ room, reconnectToken, playerId }) => {
      sessionStorage.setItem(
        'uno_reconnect_session',
        JSON.stringify({ roomId: room.id, playerId, reconnectToken })
      );
      set({ room, reconnectToken, playerId, gameState: null, myHand: [] });
    });

    socket.on('reconnected', ({ room, gameState, myHand, playerId }) => {
      set({ room, gameState: gameState ?? null, myHand, playerId });
    });

    socket.on('roomUpdated', ({ room }) => {
      set({ room });
    });

    socket.on('gameStarted', ({ gameState, myHand }) => {
      set({ gameState, myHand });
    });

    socket.on('gameStateUpdated', ({ gameState }) => {
      set({ gameState });
    });

    socket.on('yourHandUpdated', ({ hand }) => {
      set({ myHand: hand });
    });

    socket.on('actionRejected', ({ reason }) => {
      set({ errorToast: reason });
    });

    socket.on('errorNotification', ({ message }) => {
      set({ errorToast: message });
    });

    socket.on('chatReceived', (msg) => {
      set((state) => ({
        chatMessages: [...state.chatMessages.slice(-199), msg],
        unreadChatCount: state.unreadChatCount + 1,
      }));
    });

    set({ socket });
  },

  retryConnection: () => {
    const { socket } = get();
    set({ isConnecting: true, connectionError: null });
    if (socket) {
      if (!socket.connected) {
        socket.connect();
      }
    } else {
      get().initSocket();
    }
  },

  createRoom: (playerName, avatar, settings) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('createRoom', { playerName, avatar, settings });
  },

  joinRoom: (roomCode, playerName, avatar) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('joinRoom', { roomCode, playerName, avatar });
  },

  reconnect: (roomId, playerId, reconnectToken) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('reconnectRoom', { roomId, playerId, reconnectToken });
  },

  setReady: (isReady) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('setReady', { isReady });
  },

  startGame: () => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('startGame');
  },

  playCard: (cardId, chosenColor) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('playCard', { cardId, chosenColor });
  },

  drawCard: () => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('drawCard');
  },

  playDrawnCard: (play, chosenColor) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('playDrawnCard', { play, chosenColor });
  },

  chooseColor: (color) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('chooseColor', { color });
  },

  callUno: () => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('callUno');
  },

  catchUno: (targetPlayerId) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('catchUno', { targetPlayerId });
  },

  challengeWd4: (challenge) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('challengeWd4', { challenge });
  },

  requestRematch: () => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('requestRematch');
  },

  leaveRoom: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('leaveRoom');
    }
    sessionStorage.removeItem('uno_reconnect_session');
    set({ room: null, gameState: null, myHand: [], reconnectToken: null });
  },

  addAiPlayer: (difficulty) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('addAiPlayer', { difficulty });
  },

  removeAiPlayer: (playerId) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('removeAiPlayer', { playerId });
  },

  clearError: () => set({ errorToast: null }),

  sendChat: (message) => {
    const { socket } = get();
    if (!socket) return;
    const trimmed = message.trim();
    if (!trimmed || trimmed.length > 200) return;
    socket.emit('sendChat', { message: trimmed });
  },

  clearUnreadChat: () => set({ unreadChatCount: 0 }),
}));
