import { useWebSocket } from "../hooks/use-websocket";
import { useAuth } from "../hooks/use-auth";
import { useLocation } from "wouter";

interface WebSocketProviderProps {
  children: React.ReactNode;
}

// Páginas onde NÃO deve ter WebSocket (páginas públicas/pré-login)
const PAGES_WITHOUT_WEBSOCKET = [
  '/',                    // Landing page
  '/login',              // Tela de login
  '/register',           // Tela de cadastro
  '/forgot-password',    // Recuperação de senha
];

// Função para verificar se é página pública (funciona em mobile e desktop)
function isPublicPage(location: string): boolean {
  // Normalizar a rota removendo parâmetros de query e hash
  const cleanLocation = location.split('?')[0].split('#')[0];
  
  // Verificar rotas exatas
  if (PAGES_WITHOUT_WEBSOCKET.includes(cleanLocation)) {
    return true;
  }
  
  // Verificar se está na landing page (várias formas)
  if (cleanLocation === '' || cleanLocation === '/') {
    return true;
  }
  
  return false;
}

// Componente interno que só executa o hook quando necessário
function WebSocketConnection() {
  useWebSocket();
  return null;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  // Verificar se está em página que não deve ter WebSocket
  const isPagePublic = isPublicPage(location);

  // BLOQUEIO ABSOLUTO: SÓ CONECTAR WebSocket se TODAS as condições forem atendidas:
  // 1. Usuário estiver logado E tem dados válidos E tem ID
  // 2. NÃO estiver em página pública (landing, login, cadastro, etc.)
  const shouldConnectWebSocket = user && user.id && typeof user.id === 'number' && !isPagePublic;

  if (shouldConnectWebSocket) {
    console.log(`🔌 [${user.profileType}] ${user.name} (ID: ${user.id}) logado na página ${location}, conectando WebSocket...`);
  } else {
    if (!user) {
      console.log(`🚫 BLOQUEIO TOTAL: Usuário inexistente na página ${location}, SEM WebSocket`);
    } else if (!user.id) {
      console.log(`🚫 BLOQUEIO TOTAL: Usuário sem ID na página ${location}, SEM WebSocket`);
    } else if (isPagePublic) {
      console.log(`🚫 BLOQUEIO TOTAL: Página pública ${location} detectada, SEM WebSocket`);
    }
  }

  return (
    <>
      {shouldConnectWebSocket && <WebSocketConnection />}
      {children}
    </>
  );
}