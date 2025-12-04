import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bell, Search, Filter, CheckCheck, Clock, Pill, Calendar, ClipboardCheck, ChevronLeft, ChevronRight, FileText, AlertTriangle } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  scheduledFor: string;
  relatedId?: number;
  patientName?: string;
  priority?: string;
  editorName?: string;
  editorId?: number;
  metadata?: string;
}

export default function NotificationsMobile() {
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Se não for mobile, redireciona para home (ou você pode criar uma versão desktop)
  if (!isMobile) {
    navigate("/home");
    return null;
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'medication' | 'appointment' | 'test' | 'prescription' | 'vital_sign' | 'adherence' | 'system'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loadingNotifications, setLoadingNotifications] = useState<Set<number>>(new Set());

  // Buscar notificações
  const { data: enterpriseResponse, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await apiRequest({
        url: "/api/notifications",
        method: "GET",
        on401: "throw"
      });
      // A resposta pode ser um array direto ou um objeto com uma propriedade 'notifications'
      const data = await response.json();
      return data;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Extrair dados da resposta - pode ser array direto ou dentro de objeto
  const notifications = Array.isArray(enterpriseResponse) ? enterpriseResponse : (enterpriseResponse?.notifications || []);
  const summary = enterpriseResponse?.summary || {
    total: notifications.length,
    unread: Array.isArray(notifications) ? notifications.filter((n: Notification) => !n.isRead).length : 0
  };

  // Marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      setLoadingNotifications(prev => new Set(prev).add(notificationId));
      const response = await apiRequest({
        url: `/api/notifications/${notificationId}/read`,
        method: "PUT",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async (_, notificationId) => {
      // Invalidar as queries
      await queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });

      // Aguardar que a query realmente termine de carregar os novos dados
      await queryClient.refetchQueries({ queryKey: ["/api/notifications"] });

      // Verificar se a notificação realmente foi marcada como lida
      const checkNotificationUpdated = () => {
        const currentNotifications = queryClient.getQueryData(["/api/notifications"]) as Notification[];
        if (currentNotifications) {
          const updatedNotification = currentNotifications.find(n => n.id === notificationId);
          return updatedNotification?.isRead === true;
        }
        return false;
      };

      // Aguardar até a notificação estar realmente marcada como lida na lista
      let attempts = 0;
      const maxAttempts = 20; // máximo 4 segundos (20 * 200ms)

      const waitForUpdate = () => {
        if (checkNotificationUpdated() || attempts >= maxAttempts) {
          setLoadingNotifications(prev => {
            const newSet = new Set(prev);
            newSet.delete(notificationId);
            return newSet;
          });
        } else {
          attempts++;
          setTimeout(waitForUpdate, 200);
        }
      };

      waitForUpdate();
    },
    onError: (_, notificationId) => {
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

  // Marcar todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest({
        url: "/api/notifications/mark-all-read",
        method: "PUT",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Sucesso",
        description: `${data.markedCount || 0} notificações marcadas como lidas.`,
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

  // Filtrar notificações
  const filteredNotifications = notifications.filter((notification: Notification) => {
    const matchesSearch = notification.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filter === 'all' ||
                         (filter === 'read' && notification.isRead) ||
                         (filter === 'unread' && !notification.isRead);

    const matchesType = typeFilter === 'all' ||
                       (typeFilter === 'medication' && notification.type.startsWith('medication_')) ||
                       (typeFilter === 'appointment' && notification.type.startsWith('appointment_')) ||
                       (typeFilter === 'test' && notification.type.startsWith('test_')) ||
                       (typeFilter === 'prescription' && notification.type.startsWith('prescription_')) ||
                       (typeFilter === 'vital_sign' && notification.type.startsWith('vital_sign_')) ||
                       (typeFilter === 'adherence' && (notification.type.includes('adherence') || notification.type.includes('congratulations') || notification.type.includes('weekly_report') || notification.type.includes('monthly_report'))) ||
                       (typeFilter === 'system' && (notification.type.includes('share') || notification.type.includes('access') || notification.type.includes('auth_') || notification.type.includes('update') || notification.type.includes('system_')));

    return matchesSearch && matchesFilter && matchesType;
  }).sort((a: Notification, b: Notification) => {
    // Não lidas primeiro, depois por data mais recente
    if (!a.isRead && b.isRead) return -1;
    if (a.isRead && !b.isRead) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filter, typeFilter]);

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

  // Contar notificações
  const unreadCount = summary.unread;
  const todayCount = notifications.filter((n: Notification) => {
    const today = new Date();
    const notifDate = new Date(n.createdAt);
    return notifDate.toDateString() === today.toDateString();
  }).length;

  // Função para obter ícone do tipo de notificação
  const getNotificationIcon = (type: string) => {
    if (type.startsWith('medication_')) {
      return <Pill className="w-5 h-5 text-blue-600" />;
    } else if (type.startsWith('appointment_')) {
      return <Calendar className="w-5 h-5 text-green-600" />;
    } else if (type.startsWith('test_')) {
      return <ClipboardCheck className="w-5 h-5 text-yellow-600" />;
    } else if (type.startsWith('prescription_')) {
      return <ClipboardCheck className="w-5 h-5 text-purple-600" />;
    } else if (type.startsWith('vital_sign_')) {
      return <Bell className="w-5 h-5 text-red-600" />;
    } else if (type.includes('adherence') || type.includes('congratulations') || type.includes('weekly_report') || type.includes('monthly_report')) {
      return <Bell className="w-5 h-5 text-orange-600" />;
    } else {
      return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  // Função para obter cor do tipo de notificação
  const getNotificationColor = (type: string) => {
    if (type.startsWith('medication_')) {
      return 'bg-blue-100';
    } else if (type.startsWith('appointment_')) {
      return 'bg-green-100';
    } else if (type.startsWith('test_')) {
      return 'bg-yellow-100';
    } else if (type.startsWith('prescription_')) {
      return 'bg-purple-100';
    } else if (type.startsWith('vital_sign_')) {
      return 'bg-red-100';
    } else if (type.includes('adherence') || type.includes('congratulations') || type.includes('weekly_report') || type.includes('monthly_report')) {
      return 'bg-orange-100';
    } else {
      return 'bg-slate-100';
    }
  };

  // Função para obter label do tipo
  const getTypeLabel = (type: string) => {
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

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="mobile-container">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
              className="mr-3"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Notificações</h1>
              <p className="text-sm text-slate-500">Gerencie seus lembretes e alertas</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-100">
            <Bell className="w-5 h-5 text-orange-600" />
          </div>
        </div>

        {/* Botão marcar todas como lidas */}
        {unreadCount > 0 && (
          <div className="mb-4">
            <Button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              variant="outline"
              size="sm"
              className="w-full relative"
            >
              {markAllAsReadMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Marcando todas...
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Marcar todas como lidas ({unreadCount})
                </>
              )}
            </Button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{summary.total}</div>
              <div className="text-sm text-slate-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
              <div className="text-sm text-slate-600">Não lidas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{todayCount}</div>
              <div className="text-sm text-slate-600">Hoje</div>
            </CardContent>
          </Card>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-24">
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Buscar notificações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="unread">Não lidas</SelectItem>
                <SelectItem value="read">Lidas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="medication">Medicamentos</SelectItem>
                <SelectItem value="appointment">Consultas</SelectItem>
                <SelectItem value="test">Exames</SelectItem>
                <SelectItem value="prescription">Receitas</SelectItem>
                <SelectItem value="vital_sign">Sinais Vitais</SelectItem>
                <SelectItem value="adherence">Aderência</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {searchTerm || filter !== 'all' || typeFilter !== 'all'
                  ? "Nenhuma notificação encontrada"
                  : "Nenhuma notificação"}
              </h3>
              <p className="text-slate-600">
                {searchTerm || filter !== 'all' || typeFilter !== 'all'
                  ? "Tente ajustar os filtros de busca"
                  : "Você não tem notificações no momento"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {paginatedNotifications.map((notification: Notification) => (
              <Card
                key={notification.id}
                className={`mb-4 cursor-pointer hover:shadow-md transition-shadow relative ${
                  !notification.isRead ? 'border-l-4 border-l-orange-500 bg-orange-50/30' : ''
                } ${loadingNotifications.has(notification.id) ? 'pointer-events-none opacity-75' : ''}`}
                onClick={() => {
                  if (!loadingNotifications.has(notification.id) && !notification.isRead) {
                    markAsReadMutation.mutate(notification.id);
                  }
                }}
              >
                <CardContent className="p-4">
                  {/* Loading overlay */}
                  {loadingNotifications.has(notification.id) && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-1">
                        {/* Linha do usuário que editou e nome do paciente */}
                        {notification.type.includes('edited') && (
                          <div className="text-xs text-gray-500">
                            <span dangerouslySetInnerHTML={{
                              __html: (() => {
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
                                return '';
                              })()
                            }} />
                          </div>
                        )}

                        <h3 className={`font-semibold text-slate-800 ${!notification.isRead ? 'font-bold' : ''}`}>
                          <span dangerouslySetInnerHTML={{
                            __html: notification.title.replace(/"([^"]+)"/g, '<strong>$1</strong>')
                          }} />
                        </h3>
                      </div>

                      <p className={`text-slate-600 text-sm mb-2 ${!notification.isRead ? 'font-medium' : ''}`}>
                        {notification.message}
                      </p>

                      {/* Informações do editor e data/hora */}
                      <div className="flex flex-col gap-1">
                        {/* Linha do usuário que editou */}
                        {notification.type.includes('edited') && (
                          <div className="flex items-center text-xs text-slate-500">
                            <span className="font-medium">Editado por:</span>
                            <span className="ml-1">
                              {notification.editorName || 'Usuário do sistema'}
                            </span>
                          </div>
                        )}

                        {/* Data e hora */}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(notification.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {/* Controles de paginação - sempre visível */}
        <div className="flex flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-lg mt-6 mb-8">
          <div className="flex items-center gap-2">
            <Label htmlFor="itemsPerPage" className="text-sm font-medium text-slate-600 hidden sm:block">
              Itens por página:
            </Label>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
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

          {/* Paginação Previous/Next */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || totalPages === 0}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>

            <span className="text-sm text-slate-600 px-3">
              {totalPages === 0 ? "0 de 0" : `${currentPage} de ${totalPages}`}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="flex items-center gap-1"
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight className="w-4 h-4 sm:ml-1" />
            </Button>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}