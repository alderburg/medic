import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Clock, AlertCircle, Heart, Calendar, Pill, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useRef, useEffect } from "react";
import { useWebSocketNotifications } from '@/hooks/use-websocket-notifications';

// Função para formatar tempo em horas e minutos
const formatDelayTime = (totalMinutes: number): string => {
  const absMinutes = Math.abs(totalMinutes);

  if (absMinutes < 60) {
    return `${absMinutes} min`;
  }

  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
};

interface Notification {
  id: number;
  globalNotificationId: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  status: 'unread' | 'read';
  isRead: boolean;
  createdAt: string;
  relatedId?: number;
  scheduledFor?: string;
  patientName?: string;
  priority?: string;
  editorName?: string;
  editorId?: number;
  metadata?: string;
}

export default function NotificationsPanel() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [bellAnimation, setBellAnimation] = useState('');
  const [loadingNotifications, setLoadingNotifications] = useState<Set<number>>(new Set());
  const buttonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const prevUnreadCountRef = useRef<number>(0);

  // Habilitar WebSocket para notificações em tempo real
  const { isConnected } = useWebSocketNotifications();

  // Buscar notificações apenas uma vez na inicialização (WebSocket manterá atualizado)
  const { data: legacyResponse, refetch: refetchNotifications } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      console.log('🔍 NotificationsPanel: Carregamento inicial de notificações...');

      try {
        const response = await api.get("/api/notifications?limit=50&offset=0");
        console.log('📊 NotificationsPanel: Resposta inicial recebida:', response.data);

        if (!response.data) {
          return { notifications: [], summary: { total: 0, unread: 0 }, pagination: {} };
        }

        let notifications = [];
        let summary = { total: 0, unread: 0 };

        if (Array.isArray(response.data)) {
          notifications = response.data;
          summary = {
            total: notifications.length,
            unread: notifications.filter(n => !n.isRead).length
          };
        } else {
          notifications = Array.isArray(response.data.notifications) ? response.data.notifications : [];
          summary = response.data.summary || { total: 0, unread: 0 };
        }

        return {
          notifications: notifications,
          summary: summary,
          pagination: response.data.pagination || {}
        };
      } catch (error) {
        console.error('❌ NotificationsPanel: Erro no carregamento inicial:', error);
        return { notifications: [], summary: { total: 0, unread: 0 }, pagination: {} };
      }
    },
    // Remover polling - WebSocket manterá atualizado
    refetchInterval: false,
    retry: 1,
    staleTime: Infinity, // Cache infinito - WebSocket atualizará quando necessário
  });

  // Extrair notificações corretamente - pode ser array direto ou dentro de objeto
  const notifications = Array.isArray(legacyResponse) ? legacyResponse : (legacyResponse?.notifications || []);
  const summary = legacyResponse?.summary || { 
    total: notifications.length, 
    unread: notifications.filter((n: Notification) => !n.isRead).length 
  };

  // CORREÇÃO: Se o summary.unread está incorreto, calcular baseado nas notificações reais
  const calculatedUnread = notifications.filter((n: Notification) => !n.isRead).length;
  const correctedSummary = {
    ...summary,
    unread: Math.max(summary.unread, calculatedUnread) // Usar o maior valor
  };

  // Debug: log para verificar o que está sendo recebido
  console.log('🔍 Debug notifications:', { 
    totalNotifications: notifications.length, 
    unreadCount: correctedSummary.unread,
    summaryUnread: summary.unread,
    calculatedUnread: calculatedUnread,
    firstNotification: notifications[0],
    allNotifications: notifications.slice(0, 3) // Mostrar primeiras 3 para debug
  });

  // Marcar notificação como lida (legacy API)
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      setLoadingNotifications(prev => new Set(prev).add(notificationId));
      await api.put(`/api/notifications/${notificationId}/read`);
      return notificationId;
    },
    onSuccess: async (notificationId) => {
      // Invalidar e refetch as queries (legacy)
      await queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      await queryClient.refetchQueries({ queryKey: ["/api/notifications"] });

      // Remover o loading
      setLoadingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    },
    onError: (_, notificationId) => {
      // Remover o loading em caso de erro
      setLoadingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    },
  });

  // Marcar todas as notificações como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      // Buscar todas as notificações não lidas
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      // Marcar cada uma individualmente
      for (const notification of unreadNotifications) {
        await api.put(`/api/notifications/${notification.id}/read`);
      }
      
      return { markedCount: unreadNotifications.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      // Fechar o modal após marcar todas
      setIsOpen(false);
    },
    onError: (error) => {
      console.error('Erro ao marcar todas como lidas:', error);
    },
  });

  // Filtrar apenas notificações não lidas
  const unreadNotifications = Array.isArray(notifications) ? notifications.filter((n: Notification) => !n.isRead) : [];
  const unreadCount = Math.max(correctedSummary.unread, unreadNotifications.length);

  // Detectar novas notificações e aplicar efeito visual
  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      setHasNewNotifications(true);
      setBellAnimation('animate-bounce');

      // Parar animação após 3 segundos
      setTimeout(() => {
        setBellAnimation('');
        setHasNewNotifications(false);
      }, 3000);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // Fechar modal quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen && !isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isMobile]);

  const handleClick = () => {
    if (isMobile) {
      // Mobile: navegar para página de notificações
      setLocation('/notifications');
    } else {
      // Desktop: abrir/fechar modal
      setIsOpen(!isOpen);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    // Não fechar o modal, apenas marcar como lida
  };

  const getNotificationIcon = (type: string) => {
    // Ícones baseados na categoria da entidade médica
    if (type.startsWith('medication_')) {
      return <Pill className="w-4 h-4 text-blue-600" />;
    } else if (type.startsWith('appointment_')) {
      return <Calendar className="w-4 h-4 text-green-600" />;
    } else if (type.startsWith('test_')) {
      return <FileText className="w-4 h-4 text-yellow-600" />;
    } else if (type.startsWith('prescription_')) {
      return <FileText className="w-4 h-4 text-purple-600" />;
    } else if (type.startsWith('vital_sign_')) {
      return <Heart className="w-4 h-4 text-red-600" />;
    } else if (type.includes('adherence') || type.includes('congratulations') || type.includes('weekly_report') || type.includes('monthly_report')) {
      return <AlertCircle className="w-4 h-4 text-orange-600" />;
    } else {
      return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    // Mapear tipos baseados na entidade médica
    if (type.startsWith('medication_')) {
      return 'Medicamento';
    } else if (type.startsWith('appointment_')) {
      return 'Consulta';
    } else if (type.startsWith('test_')) {
      return 'Exame';
    } else if (type.startsWith('prescription_')) {
      return 'Receita';
    } else if (type.startsWith('vital_sign_')) {
      return 'Sinais Vitais';
    } else if (type.includes('adherence') || type.includes('congratulations') || type.includes('weekly_report') || type.includes('monthly_report')) {
      return 'Aderência';
    } else if (type.includes('share') || type.includes('access') || type.includes('auth_') || type.includes('update') || type.includes('system_')) {
      return 'Sistema';
    } else {
      return 'Sistema';
    }
  };

  return (
    <div className="relative">
      <Button 
        ref={buttonRef}
        variant="ghost" 
        size="icon" 
        className={`relative transition-all duration-200 ${bellAnimation} ${hasNewNotifications ? 'bg-yellow-50 hover:bg-yellow-100' : ''}`}
        onClick={handleClick}
      >
        <Bell className={`w-5 h-5 transition-colors ${hasNewNotifications ? 'text-yellow-600' : 'text-gray-600'}`} />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs transition-all ${hasNewNotifications ? 'animate-pulse scale-110' : ''}`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
        {hasNewNotifications && (
          <div className="absolute inset-0 rounded-full bg-yellow-400 opacity-20 animate-ping"></div>
        )}
      </Button>

      {/* Modal de notificações (apenas desktop) */}
      {!isMobile && isOpen && (
        <div 
          ref={modalRef}
          className="fixed top-[4rem] right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notificações</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                  >
                    {markAllAsReadMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                        Marcando...
                      </>
                    ) : (
                      'Marcar todas'
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {unreadNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nenhuma notificação não lida</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {unreadNotifications.slice(0, 10).map((notification: Notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors relative ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    } ${loadingNotifications.has(notification.id) ? 'pointer-events-none opacity-75' : ''}`}
                    onClick={() => {
                      if (!loadingNotifications.has(notification.id)) {
                        handleNotificationClick(notification);
                      }
                    }}
                  >
                    {/* Loading overlay específico da notificação */}
                    {loadingNotifications.has(notification.id) && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium text-gray-500">
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          <span dangerouslySetInnerHTML={{
                            __html: (() => {
                              // Formatação melhorada com nome do paciente
                              if (notification.type.includes('edited')) {
                                const patientName = notification.patientName || 'Paciente';
                                if (notification.type.startsWith('prescription_')) {
                                  return `Receita de <strong>${patientName}</strong> editada`;
                                } else if (notification.type.startsWith('test_')) {
                                  return `Exame de <strong>${patientName}</strong> editado`;
                                } else if (notification.type.startsWith('appointment_')) {
                                  return `Consulta de <strong>${patientName}</strong> editada`;
                                } else if (notification.type.startsWith('medication_')) {
                                  return `Medicamento de <strong>${patientName}</strong> editado`;
                                }
                              }
                              // Título original com formatação para outros tipos
                              return notification.title.replace(/"([^"]+)"/g, '<strong>$1</strong>');
                            })()
                          }} />
                        </p>
                        <p className="text-xs text-gray-600">
                          <span dangerouslySetInnerHTML={{
                            __html: (() => {
                              // Se for uma notificação de medicamento atrasado, formatar o tempo
                              if (notification.message.includes('minutos atrasado')) {
                                const match = notification.message.match(/(\d+) minutos atrasado/);
                                if (match) {
                                  const minutes = parseInt(match[1]);
                                  const medicationName = notification.message.split(' está')[0];
                                  return `${medicationName} está ${formatDelayTime(minutes)} atrasado`;
                                }
                              }
                              // Se for uma notificação de medicamento adiantado, formatar o tempo
                              else if (notification.message.includes('minutos adiantado')) {
                                const match = notification.message.match(/(\d+) minutos adiantado/);
                                if (match) {
                                  const minutes = parseInt(match[1]);
                                  const medicationName = notification.message.split(' está')[0];
                                  return `${medicationName} está ${formatDelayTime(minutes)} adiantado`;
                                }
                              }
                              // Formatação especial para consultas
                              else if (notification.message.includes('status alterado para "completed"')) {
                                const titleMatch = notification.title.match(/Consulta "(.+?)"/);
                                if (titleMatch) {
                                  const consultaName = titleMatch[1];
                                  return `Consulta <strong>${consultaName}</strong> foi concluída`;
                                }
                              }
                              else if (notification.message.includes('status alterado para "missed"')) {
                                const titleMatch = notification.title.match(/Consulta "(.+?)"/);
                                if (titleMatch) {
                                  const consultaName = titleMatch[1];
                                  return `Consulta <strong>${consultaName}</strong> foi marcada como perdida`;
                                }
                              }
                              else if (notification.message.includes('status alterado para "cancelled"')) {
                                const titleMatch = notification.title.match(/Consulta "(.+?)"/);
                                if (titleMatch) {
                                  const consultaName = titleMatch[1];
                                  return `Consulta <strong>${consultaName}</strong> foi cancelada`;
                                }
                              }
                              // Formatação especial para exames
                              else if (notification.message.includes('status alterado para "completed"') && notification.type.startsWith('test_')) {
                                const titleMatch = notification.title.match(/Exame "(.+?)"/);
                                if (titleMatch) {
                                  const exameName = titleMatch[1];
                                  return `Exame <strong>${exameName}</strong> foi concluído`;
                                }
                              }
                              else if (notification.message.includes('status alterado para "missed"') && notification.type.startsWith('test_')) {
                                const titleMatch = notification.title.match(/Exame "(.+?)"/);
                                if (titleMatch) {
                                  const exameName = titleMatch[1];
                                  return `Exame <strong>${exameName}</strong> foi marcado como perdido`;
                                }
                              }
                              else if (notification.message.includes('status alterado para "cancelled"') && notification.type.startsWith('test_')) {
                                const titleMatch = notification.title.match(/Exame "(.+?)"/);
                                if (titleMatch) {
                                  const exameName = titleMatch[1];
                                  return `Exame <strong>${exameName}</strong> foi cancelado`;
                                }
                              }
                              // Retornar mensagem original com formatação para aspas
                              return notification.message.replace(/"([^"]+)"/g, '<strong>$1</strong>');
                            })()
                          }} />
                        </p>
                        
                        {/* Informações do editor e data/hora */}
                        <div className="flex flex-col gap-1 mt-2">
                          {/* Linha do usuário que editou - extrair do metadata se disponível */}
                          {notification.type.includes('edited') && (
                            <div className="flex items-center text-xs text-gray-500">
                              <span className="font-medium">Editado por:</span>
                              <span className="ml-1">
                                {notification.editorName || 'Usuário do sistema'}
                              </span>
                            </div>
                          )}
                          
                          {/* Data e hora */}
                          <div className="flex items-center text-xs text-gray-400">
                            <Clock className="w-3 h-3 mr-1" />
                            {(() => {
                              const date = new Date(notification.createdAt);
                              return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-center text-blue-600 hover:text-blue-700"
              onClick={() => {
                setIsOpen(false);
                setLocation('/notifications');
              }}
            >
              Ver todas as notificações
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}