import { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from './use-auth';

// Extensão do tipo Window para incluir flag global
declare global {
  interface Window {
    webSocketConnectionActive?: boolean;
  }
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

// Singleton global para garantir uma única instância WebSocket
class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private isAuthenticated = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private authTimeout: NodeJS.Timeout | null = null;
  private listeners = new Set<(connected: boolean) => void>();
  private currentToken: string | null = null;
  private connectionAttempts = 0;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  addListener(callback: (connected: boolean) => void) {
    this.listeners.add(callback);
    callback(this.isConnected());
  }

  removeListener(callback: (connected: boolean) => void) {
    this.listeners.delete(callback);
  }

  private notifyListeners() {
    const connected = this.isConnected();
    this.listeners.forEach(listener => listener(connected));
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  connect(userLoggedIn: boolean) {
    // VERIFICAÇÃO EXTRA: Não conectar se estiver em páginas públicas
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const publicPaths = ['/', '/login', '/register', '/forgot-password'];
    
    // Normalizar path e verificar se é página pública
    const cleanPath = currentPath.split('?')[0].split('#')[0];
    const isPublicPage = publicPaths.includes(cleanPath) || cleanPath === '';

    if (!userLoggedIn || isPublicPage) {
      if (!userLoggedIn) {
        console.log('🚫 Usuário não logado, desconectando WebSocket se existir');
      } else if (isPublicPage) {
        console.log(`🚫 Página pública ${cleanPath} detectada, não conectando WebSocket`);
      }
      this.disconnect();
      return;
    }

    // Se já está conectado E autenticado, não fazer nada
    if (this.isConnected()) {
      console.log('✅ WebSocket já conectado e autenticado, reutilizando conexão');
      this.notifyListeners();
      return;
    }

    // Se está conectando, aguardar
    if (this.isConnecting) {
      console.log('⏳ WebSocket já conectando, aguardando...');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ Token não encontrado, não conectando WebSocket');
      return;
    }

    // Verificar se token não expirou
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        console.log('❌ Token expirado, não conectando WebSocket');
        return;
      }
    } catch (e) {
      console.log('❌ Token inválido, não conectando WebSocket');
      return;
    }

    // Se já há uma conexão ativa mas não autenticada, usar ela
    if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isAuthenticated) {
      console.log('🔄 Reutilizando conexão existente para autenticação');
      this.currentToken = token;
      this.ws.send(JSON.stringify({ type: 'auth', token: this.currentToken }));
      return;
    }

    // Verificar se já existe uma conexão WebSocket ativa globalmente
    if (window.webSocketConnectionActive) {
      console.log('⚠️ Já existe uma conexão WebSocket ativa globalmente, ignorando nova tentativa');
      return;
    }

    // Marcar globalmente que há uma conexão ativa
    window.webSocketConnectionActive = true;

    this.isConnecting = true;
    this.currentToken = token;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log(`🔗 Conectando WebSocket único (tentativa ${this.connectionAttempts})...`, {
      isConnecting: this.isConnecting,
      isConnected: this.isConnected(),
      hasToken: !!token
    });

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket conectado');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        if (this.ws && this.currentToken) {
          console.log('🔑 Enviando autenticação...');
          this.ws.send(JSON.stringify({ type: 'auth', token: this.currentToken }));

          this.authTimeout = setTimeout(() => {
            if (!this.isAuthenticated) {
              console.log('❌ Timeout de autenticação');
              this.disconnect();
            }
          }, 10000);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Mensagem WebSocket recebida:', message.type, message);

          if (message.type === 'auth_success') {
            this.isAuthenticated = true;
            this.connectionAttempts = 0; // Reset tentativas após sucesso
            if (this.authTimeout) {
              clearTimeout(this.authTimeout);
              this.authTimeout = null;
            }
            console.log('🔐 Autenticação bem-sucedida');
            this.notifyListeners();
          } else if (message.type === 'enterprise_notification') {
            console.log('🔔 Notificação enterprise recebida:', message.data);
            // Emitir evento customizado para que componentes possam escutar
            window.dispatchEvent(new CustomEvent('enterprise_notification', {
              detail: message.data
            }));
          } else if (message.type === 'medication_updated' ||
                     message.type === 'medication_created' ||
                     message.type === 'notification_created') {
            console.log('📊 Update em tempo real:', message.type, message.data);
            // Emitir eventos para outros tipos de atualizações
            window.dispatchEvent(new CustomEvent('realtime_update', {
              detail: { type: message.type, data: message.data }
            }));
          }
        } catch (error) {
          console.error('❌ Erro processando mensagem:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('📡 WebSocket desconectado:', event.code);
        // Limpar flag global de conexão ativa
        if (typeof window !== 'undefined') {
          window.webSocketConnectionActive = false;
        }
        this.cleanup();

        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts && userLoggedIn) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          console.log(`🔄 Reconectando em ${delay/1000}s`);

          this.reconnectTimeout = setTimeout(() => {
            this.connect(userLoggedIn);
          }, delay);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ Erro WebSocket:', error);
        this.cleanup();
      };

    } catch (error) {
      console.error('❌ Erro criando WebSocket:', error);
      this.isConnecting = false;
    }
  }

  disconnect() {
    console.log('🚪 Desconectando WebSocket...');
    this.cleanup();

    if (this.ws) {
      this.ws.close(1000, 'User logout');
      this.ws = null;
    }
  }

  private cleanup() {
    this.isConnecting = false;
    this.isAuthenticated = false;
    this.currentToken = null;

    // Limpar flag global
    if (typeof window !== 'undefined') {
      window.webSocketConnectionActive = false;
    }

    if (this.authTimeout) {
      clearTimeout(this.authTimeout);
      this.authTimeout = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.notifyListeners();
  }

  sendMessage(message: WebSocketMessage) {
    if (this.isConnected() && this.ws) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

export function useWebSocket() {
  const { user } = useAuth();
  
  // VERIFICAÇÃO DE SEGURANÇA ABSOLUTA: Não executar EM NADA em páginas públicas
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const publicPaths = ['/', '/login', '/register', '/forgot-password'];
  const cleanPath = currentPath.split('?')[0].split('#')[0];
  const isPublicPage = publicPaths.includes(cleanPath) || cleanPath === '';
  
  if (isPublicPage || !user || !user.id) {
    if (isPublicPage) {
      console.log(`🛡️ BLOQUEIO ABSOLUTO: Hook WebSocket completamente bloqueado na página pública ${cleanPath}`);
    } else if (!user || !user.id) {
      console.log('🛡️ BLOQUEIO ABSOLUTO: Hook WebSocket bloqueado - usuário não autenticado');
    }
    
    // Retorno imediato sem inicializar nenhum estado ou ref
    return {
      isConnected: false,
      sendMessage: () => {},
      reconnectAttempts: 0,
      maxReconnectAttempts: 5
    };
  }

  const [isConnected, setIsConnected] = useState(false);
  const wsManager = useRef<WebSocketManager>(WebSocketManager.getInstance());

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  useEffect(() => {
    const manager = wsManager.current;

    manager.addListener(handleConnectionChange);

    // VERIFICAÇÃO RIGOROSA: Só conectar se usuário estiver realmente logado E não em página pública
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const publicPaths = ['/', '/login', '/register', '/forgot-password'];
    
    // Normalizar path para verificação consistente
    const cleanPath = currentPath.split('?')[0].split('#')[0];
    const isPublicPage = publicPaths.includes(cleanPath) || cleanPath === '';

    if (user && user.id && !isPublicPage) {
      console.log(`🔌 Usuário ${user.name} (ID: ${user.id}) logado na página ${cleanPath}, conectando WebSocket...`);
      manager.connect(true);
    } else {
      if (!user || !user.id) {
        console.log('🚪 Usuário não logado ou dados inválidos, desconectando WebSocket...');
      } else if (isPublicPage) {
        console.log(`🚪 Página pública ${cleanPath} detectada, desconectando WebSocket...`);
      }
      manager.disconnect();
    }

    return () => {
      manager.removeListener(handleConnectionChange);
    };
  }, [user, handleConnectionChange]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    wsManager.current.sendMessage(message);
  }, []);

  return {
    isConnected,
    sendMessage,
    reconnectAttempts: wsManager.current['reconnectAttempts'] || 0,
    maxReconnectAttempts: wsManager.current['maxReconnectAttempts'] || 5
  };
}