import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import { runEnterpriseMigration } from "./migration-enterprise";
import { log } from "./vite";
import { startNotificationScheduler } from './notification-scheduler';
import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { storage } from './storage';

const app = express();

// Configurar sessão ANTES de outros middlewares
app.use(session({
  secret: process.env.SESSION_SECRET || 'meu-cuidador-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  },
  name: 'meu-cuidador-session'
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(body: any) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    return originalSend.call(this, body);
  };

  next();
});

// EXECUTAR MIGRATION ENTERPRISE NO STARTUP
async function initializeEnterprise() {
  try {
    console.log('🚀 Inicializando sistema enterprise...');
    await runEnterpriseMigration();

    // INICIAR SCHEDULER AUTOMÁTICO DE NOTIFICAÇÕES
    startNotificationScheduler();

  } catch (error) {
    console.error('❌ Erro na inicialização enterprise:', error);
  }
}

initializeEnterprise();

// CONFIGURAR ROTAS E SERVIDOR
(async () => {
  const server = createServer(app);

  const routes = registerRoutes();
  app.use("/api", routes);

  // 🔧 CONFIGURAR WEBSOCKET SERVER CORRIGIDO
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  // Map para armazenar conexões autenticadas (userId -> WebSocket única)
  const authenticatedConnections = new Map<number, WebSocket>();

  wss.on('connection', (ws: WebSocket, req: any) => {
    const connectionId = Math.random().toString(36).substr(2, 9);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
    
    console.log(`📡 Nova conexão WebSocket (ID: ${connectionId}) de ${ip}`);
    
    let userId: number | null = null;
    let isAuthenticated = false;

    // Timeout para autenticação (10 segundos) - mais curto para debug
    const authTimeout = setTimeout(() => {
      if (!isAuthenticated) {
        console.log(`❌ Timeout de autenticação WebSocket (ID: ${connectionId}, userId: ${userId}, authenticated: ${isAuthenticated})`);
        ws.close(1008, 'Authentication timeout');
      }
    }, 10000);

    ws.on('message', async (data: any) => {
      try {
        const messageStr = data.toString();
        console.log(`📨 Mensagem WebSocket recebida (ID: ${connectionId}):`, messageStr);
        const message = JSON.parse(messageStr);
        console.log(`🔍 Tipo de mensagem (ID: ${connectionId}):`, message.type);
        
        if (message.type === 'auth' && message.token) {
          console.log(`🔑 Processando autenticação WebSocket (ID: ${connectionId})...`);
          try {
            const decoded = jwt.verify(message.token, process.env.JWT_SECRET || 'your-secret-key') as any;
            console.log(`🔍 Token decodificado (ID: ${connectionId}):`, { userId: decoded.userId });
            const user = await storage.getUser(decoded.userId);
            console.log(`🔍 Usuário encontrado (ID: ${connectionId}):`, user ? `${user.id} - ${user.name}` : 'null');
            
            if (user) {
              userId = user.id;
              
              // VERIFICAR se já existe conexão para este usuário
              if (authenticatedConnections.has(userId!)) {
                console.log(`🚫 BLOQUEADO: Usuário ${userId} (${user.name}) já tem conexão ativa`);
                ws.close(1008, 'User already has an active connection');
                return;
              }
              
              isAuthenticated = true;
              clearTimeout(authTimeout);

              // Adicionar conexão única ao mapa
              authenticatedConnections.set(userId!, ws);

              console.log(`✅ WebSocket autenticado para usuário ${userId} (${user.name})`);
              
              ws.send(JSON.stringify({
                type: 'auth_success',
                message: 'Autenticação bem-sucedida'
              }));
            } else {
              throw new Error('Usuário não encontrado');
            }
          } catch (error: any) {
            console.error('❌ Erro na autenticação WebSocket:', error);
            ws.send(JSON.stringify({
              type: 'auth_error',
              message: 'Token inválido'
            }));
            ws.close(1008, 'Authentication failed');
          }
        }
      } catch (error: any) {
        console.error('❌ Erro processando mensagem WebSocket:', error);
      }
    });

    ws.on('close', () => {
      // Limpar timeout se ainda estiver ativo
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
      
      if (userId && authenticatedConnections.has(userId)) {
        // Remover conexão única do usuário
        authenticatedConnections.delete(userId);
        console.log(`📡 WebSocket desconectado para usuário ${userId} (ID: ${connectionId})`);
      } else {
        console.log(`📡 WebSocket desconectado sem autenticação (ID: ${connectionId})`);
      }
    });

    ws.on('error', (error: any) => {
      console.error('❌ Erro WebSocket:', error);
    });
  });

  // Disponibilizar authenticatedConnections globalmente para as rotas
  (global as any).authenticatedConnections = authenticatedConnections;

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  // INICIAR SERVIDOR NA PORTA 5000
  const PORT = Number(process.env.PORT) || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`🚀 Servidor rodando na porta ${PORT}`);
    log(`🌐 http://localhost:${PORT}`);
    log(`🏥 Sistema MeuCuidador Enterprise ativo!`);
    log(`📡 WebSocket Server configurado em /ws`);
    log(`🔌 Conexões ativas: ${wss.clients.size}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, encerrando servidor...');
    wss.close(() => {
      console.log('📡 WebSocket Server fechado');
    });
    server.close(() => {
      console.log('✅ Servidor encerrado');
      process.exit(0);
    });
  });
})();