import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, X, Clock, Pill, Calendar, AlertTriangle, Trash2, FileText, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: number;
  type: 'medication_reminder' | 'appointment_reminder' | 'test_reminder' | 'adherence' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: number;
  scheduledFor?: string;
}

export default function NotificationsDesktop() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'medication' | 'appointment' | 'test' | 'prescription' | 'vital_sign' | 'adherence' | 'system'>('all');
  const [loadingNotifications, setLoadingNotifications] = useState<Set<number>>(new Set());

  const { data: enterpriseResponse, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await apiRequest({
        url: "/api/notifications?limit=50&offset=0",
        method: "GET",
        on401: "throw"
      });
      
      const data = await response.json();
      
      // A rota legacy retorna array diretamente, não objeto com estrutura enterprise
      if (Array.isArray(data)) {
        return {
          notifications: data,
          summary: { 
            total: data.length, 
            unread: data.filter(n => !n.isRead).length 
          },
          pagination: { limit: 50, offset: 0, hasMore: data.length === 50 }
        };
      }
      
      // Estrutura enterprise esperada: { notifications: [], summary: {}, pagination: {} }
      return {
        notifications: Array.isArray(data.notifications) ? data.notifications : [],
        summary: data.summary || { total: 0, unread: 0 },
        pagination: data.pagination || {}
      };
    },
    refetchInterval: 30000, // Refetch a cada 30 segundos
  });

  // Extrair notifications da resposta enterprise
  const notifications = enterpriseResponse?.notifications || [];

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      setLoadingNotifications(prev => new Set(prev).add(notificationId));
      const response = await apiRequest({
        url: `/api/notifications/${notificationId}/read`,
        method: "PUT",
        on401: "throw"
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: async (_, notificationId) => {
      // Aguardar um breve momento para o backend processar
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Invalidar e refetch as queries de notificações
      await queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      await queryClient.refetchQueries({ queryKey: ["/api/notifications"] });
      
      // Remover o loading
      setLoadingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
      
      toast({
        title: "Sucesso",
        description: "Notificação marcada como lida.",
      });
    },
    onError: (error, notificationId) => {
      console.error('Erro ao marcar notificação como lida:', error);
      setLoadingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
      toast({
        title: "Erro",
        description: "Erro ao marcar notificação como lida.",
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      // Buscar todas as notificações não lidas
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      // Marcar cada uma individualmente
      for (const notification of unreadNotifications) {
        await apiRequest({
          url: `/api/notifications/${notification.id}/read`,
          method: "PUT",
          on401: "throw"
        });
      }
      
      return { markedCount: unreadNotifications.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Sucesso",
        description: `${data.markedCount} notificações marcadas como lidas.`,
      });
    },
    onError: (error) => {
      console.error('Erro ao marcar todas como lidas:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar todas as notificações como lidas.",
        variant: "destructive",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number | string) => {
      // Garantir que o ID é um número válido
      const numericId = typeof notificationId === 'string' ? parseInt(notificationId, 10) : notificationId;
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error('ID de notificação inválido');
      }
      const response = await apiRequest({
        url: `/api/notifications/${numericId}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error) => {
      console.error('Erro ao excluir notificação:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover notificação.",
        variant: "destructive",
      });
    }
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest({
        url: "/api/notifications/clear-read",
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Notificações limpas",
        description: "Todas as notificações lidas foram removidas.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao limpar notificações lidas.",
        variant: "destructive",
      });
    },
  });

  const getNotificationIcon = (type: string) => {
    // Ícones baseados na categoria da entidade médica
    if (type.startsWith('medication_')) {
      return <Pill className="w-5 h-5 text-blue-600" />;
    } else if (type.startsWith('appointment_')) {
      return <Calendar className="w-5 h-5 text-green-600" />;
    } else if (type.startsWith('test_')) {
      return <FileText className="w-5 h-5 text-yellow-600" />;
    } else if (type.startsWith('prescription_')) {
      return <FileText className="w-5 h-5 text-purple-600" />;
    } else if (type.startsWith('vital_sign_')) {
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    } else if (type.includes('adherence') || type.includes('congratulations') || type.includes('weekly_report') || type.includes('monthly_report')) {
      return <AlertTriangle className="w-5 h-5 text-orange-600" />;
    } else {
      return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationBgColor = (type: string, isRead: boolean) => {
    if (isRead) return "bg-gray-50/50 border-gray-200";

    // Cores baseadas na categoria da entidade médica
    if (type.startsWith('medication_')) {
      return "bg-blue-50 border-blue-200 shadow-sm";
    } else if (type.startsWith('appointment_')) {
      return "bg-green-50 border-green-200 shadow-sm";
    } else if (type.startsWith('test_')) {
      return "bg-yellow-50 border-yellow-200 shadow-sm";
    } else if (type.startsWith('prescription_')) {
      return "bg-purple-50 border-purple-200 shadow-sm";
    } else if (type.startsWith('vital_sign_')) {
      return "bg-red-50 border-red-200 shadow-sm";
    } else if (type.includes('adherence') || type.includes('congratulations') || type.includes('weekly_report') || type.includes('monthly_report')) {
      return "bg-orange-50 border-orange-200 shadow-sm";
    } else {
      return "bg-gray-50 border-gray-200 shadow-sm";
    }
  };

  const getTypeLabel = (type: string) => {
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

  const handleNotificationClick = (notification: Notification) => {
    // Always mark as read when clicked
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };





  const filteredNotifications = Array.isArray(notifications) ? notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'medication':
        return notification.type.startsWith('medication_');
      case 'appointment':
        return notification.type.startsWith('appointment_');
      case 'test':
        return notification.type.startsWith('test_');
      case 'prescription':
        return notification.type.startsWith('prescription_');
      case 'vital_sign':
        return notification.type.startsWith('vital_sign_');
      case 'adherence':
        return notification.type.includes('adherence') || notification.type.includes('congratulations') || notification.type.includes('weekly_report') || notification.type.includes('monthly_report');
      case 'system':
        return notification.type.includes('share') || notification.type.includes('access') || notification.type.includes('auth_') || notification.type.includes('update') || notification.type.includes('system_');
      default:
        return true;
    }
  }).sort((a: Notification, b: Notification) => {
    // Não lidas primeiro, depois por data mais recente
    if (!a.isRead && b.isRead) return -1;
    if (a.isRead && !b.isRead) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) : [];

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;
  const filterCounts = {
    all: Array.isArray(notifications) ? notifications.length : 0,
    unread: unreadCount,
    medication: Array.isArray(notifications) ? notifications.filter(n => n.type.startsWith('medication_')).length : 0,
    appointment: Array.isArray(notifications) ? notifications.filter(n => n.type.startsWith('appointment_')).length : 0,
    test: Array.isArray(notifications) ? notifications.filter(n => n.type.startsWith('test_')).length : 0,
    prescription: Array.isArray(notifications) ? notifications.filter(n => n.type.startsWith('prescription_')).length : 0,
    vital_sign: Array.isArray(notifications) ? notifications.filter(n => n.type.startsWith('vital_sign_')).length : 0,
    adherence: Array.isArray(notifications) ? notifications.filter(n => n.type.includes('adherence') || n.type.includes('congratulations') || n.type.includes('weekly_report') || n.type.includes('monthly_report')).length : 0,
    system: Array.isArray(notifications) ? notifications.filter(n => n.type.includes('share') || n.type.includes('access') || n.type.includes('auth_') || n.type.includes('update') || n.type.includes('system_')).length : 0
  };

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
            <Bell className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
            {unreadCount > 0 && (
              <p className="text-gray-600">{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 relative"
            >
              {markAllAsReadMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Marcando todas...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Marcar todas como lidas
                </>
              )}
            </Button>
          )}

        </div>
      </div>
      <div className="flex gap-6">
        {/* Sidebar com filtros */}
        <div className="w-80 flex-shrink-0">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={filter === 'all' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-between"
                onClick={() => setFilter('all')}
              >
                <span>Todas</span>
                <Badge variant="secondary" className="text-xs">
                  {filterCounts.all}
                </Badge>
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-between"
                onClick={() => setFilter('unread')}
              >
                <span>Não lidas</span>
                <Badge variant="secondary" className="text-xs">
                  {filterCounts.unread}
                </Badge>
              </Button>
              <Separator className="my-3" />
              <Button
                variant={filter === 'medication' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-between"
                onClick={() => setFilter('medication')}
              >
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4" />
                  <span>Medicamentos</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {filterCounts.medication}
                </Badge>
              </Button>
              <Button
                variant={filter === 'appointment' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-between"
                onClick={() => setFilter('appointment')}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Consultas</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {filterCounts.appointment}
                </Badge>
              </Button>
              <Button
                variant={filter === 'test' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-between"
                onClick={() => setFilter('test')}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Exames</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {filterCounts.test}
                </Badge>
              </Button>
              <Button
                variant={filter === 'prescription' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-between"
                onClick={() => setFilter('prescription')}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Receitas</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {filterCounts.prescription}
                </Badge>
              </Button>
              <Button
                variant={filter === 'vital_sign' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-between"
                onClick={() => setFilter('vital_sign')}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Sinais Vitais</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {filterCounts.vital_sign}
                </Badge>
              </Button>
              <Button
                variant={filter === 'adherence' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-between"
                onClick={() => setFilter('adherence')}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span>Aderência</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {filterCounts.adherence}
                </Badge>
              </Button>
              <Button
                variant={filter === 'system' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-between"
                onClick={() => setFilter('system')}
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-600" />
                  <span>Sistema</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {filterCounts.system}
                </Badge>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Lista de notificações */}
        <div className="flex-1">
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="text-center py-12">
                <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {filter === 'all' ? 'Nenhuma notificação' : 
                   filter === 'unread' ? 'Nenhuma notificação não lida' :
                   `Nenhuma notificação de ${(() => {
                     switch (filter) {
                       case 'medication': return 'Medicamentos';
                       case 'appointment': return 'Consultas';
                       case 'test': return 'Exames';
                       case 'prescription': return 'Receitas';
                       case 'vital_sign': return 'Sinais Vitais';
                       case 'adherence': return 'Aderência';
                       case 'system': return 'Sistema';
                       default: return 'Sistema';
                     }
                   })()}`}
                </h3>
                <p className="text-gray-500">
                  {filter === 'all' ? 'Suas notificações aparecerão aqui quando disponíveis.' :
                   'Tente filtrar por uma categoria diferente.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-all hover:shadow-md border ${getNotificationBgColor(notification.type, notification.isRead)} relative ${
                    loadingNotifications.has(notification.id) ? 'pointer-events-none opacity-75' : ''
                  }`}
                  onClick={() => {
                    if (!loadingNotifications.has(notification.id)) {
                      handleNotificationClick(notification);
                    }
                  }}
                >
                  <CardContent className="p-6 relative">
                    {/* Loading overlay específico da notificação - fica fixo no card */}
                    {loadingNotifications.has(notification.id) && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-col gap-2">
                              {/* Linha principal com informação formatada como no modal */}
                              <div className="flex items-center gap-3">
                                <p className={`text-sm font-medium ${notification.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                                  <span dangerouslySetInnerHTML={{
                                    __html: (() => {
                                      // Formatação melhorada com nome do paciente (igual ao modal)
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
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                )}
                              </div>

                              {/* Detalhes da alteração */}
                              <p className={`text-xs ${notification.isRead ? 'text-gray-500' : 'text-gray-600'}`}>
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
                              <div className="flex flex-col gap-1">
                                {/* Linha do usuário que editou */}
                                {notification.type.includes('edited') && (
                                  <div className="flex items-center text-xs text-gray-500">
                                    <span className="font-medium">Editado por:</span>
                                    <span className="ml-1">
                                      {notification.editorName || 'Usuário do sistema'}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Data e hora */}
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    {(() => {
                                      const date = new Date(notification.createdAt);
                                      return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
                                    })()}
                                  </div>

                                  <Badge 
                                    variant="secondary" 
                                    className="text-xs"
                                  >
                                    {getTypeLabel(notification.type)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>


                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Controles de paginação - só aparece se houver notificações */}
              {filteredNotifications.length > 0 && (
                <div className="flex flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-lg mt-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="itemsPerPageNotifications" className="text-sm font-medium text-slate-600 hidden sm:block">
                      Itens por página:
                    </Label>
                    <Select value="10" onValueChange={() => {}}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>

                    <span className="text-sm text-slate-600 px-3">
                      1 de 1
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">Próxima</span>
                      <ChevronRight className="w-4 h-4 sm:ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}