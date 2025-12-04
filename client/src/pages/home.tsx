import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import { Bell, User, Plus, Pill, Calendar as CalendarIcon, FileText, BarChart3, Heart, Droplets, Activity, Thermometer, Weight, FlaskConical, ChevronLeft, ChevronRight, Timer, CheckCircle, XCircle, AlertCircle, AlertTriangle, Clock, Stethoscope, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Calendar } from "@/components/ui/calendar";
import BottomNavigation from "@/components/bottom-navigation";
import MedicationCard from "@/components/medication-card";
import AdherenceChart from "@/components/adherence-chart";
import AddDialog from "@/components/add-medication-dialog";
import NotificationsPanel from "@/components/notifications-panel";
import PatientSelector from "@/components/patient-selector";

import { useAuth } from "@/hooks/use-auth";
import { usePatient } from "@/contexts/patient-context";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@/lib/api";
import { format, isToday, isTomorrow, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation, Link } from "wouter";
import MedicationHistoryInline from "@/components/medication-history-inline";
import { cn } from "@/lib/utils";
import { useLazyMedicalQueries } from '@/hooks/use-lazy-medical-queries';
import { useRealTimeChecker } from '@/hooks/use-real-time-checker';

// Imports para Dashboard Médico
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Patient interface - unified definition
interface Patient {
  id: number;
  name: string;
  email: string;
  age?: number;
  profileType: string;
  photo?: string;
}

// Interfaces para Dashboard Médico
interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  todayTests: number;
  pendingResults: number;
  urgentNotifications: number;
}

interface DoctorAppointment {
  id: number;
  description: string;
  appointmentDate: string;
  status: string;
  location?: string;
  notes?: string;
  patientId?: number;
  patientName?: string;
}

interface DoctorTest {
  id: number;
  type: string;
  testDate: string;
  status: string;
  location?: string;
  notes?: string;
  patientId?: number;
  patientName?: string;
}

// Componente de Carrossel Infinito
const InfiniteCarousel = ({ actions }: { actions: any[] }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [, setLocation] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Duplicar as ações para criar efeito infinito
  const duplicatedActions = [...actions, ...actions, ...actions];

  useEffect(() => {
    if (!isHovered && !isDragging) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => {
          const nextIndex = prev + 1;
          if (nextIndex >= actions.length * 2) {
            // Reset para o meio quando chegar no final
            setTimeout(() => {
              if (carouselRef.current) {
                carouselRef.current.style.transition = 'none';
                carouselRef.current.style.transform = `translateX(-${actions.length * 200}px)`;
                setTimeout(() => {
                  if (carouselRef.current) {
                    carouselRef.current.style.transition = 'transform 0.5s ease-in-out';
                  }
                }, 50);
              }
            }, 500);
            return actions.length;
          }
          return nextIndex;
        });
      }, 3000); // Move a cada 3 segundos

      return () => clearInterval(interval);
    }
  }, [isHovered, isDragging, actions.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => {
      if (prev <= 0) {
        return actions.length * 2 - 1;
      }
      return prev - 1;
    });
  };

  const goToNext = () => {
    setCurrentIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= actions.length * 2) {
        return actions.length;
      }
      return nextIndex;
    });
  };

  // Funções de drag
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setDragOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const currentX = e.clientX;
    const diff = startX - currentX;
    setDragOffset(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;

    setIsDragging(false);

    // Se arrastou mais de 50px, navegar
    if (Math.abs(dragOffset) > 50) {
      if (dragOffset > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }

    setDragOffset(0);
  };

  // Touch events para mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const diff = startX - currentX;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    // Se arrastou mais de 50px, navegar
    if (Math.abs(dragOffset) > 50) {
      if (dragOffset > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }

    setDragOffset(0);
  };

  // Expor funções para controle externo
  useEffect(() => {
    const carouselElement = carouselRef.current?.parentElement;
    if (carouselElement) {
      carouselElement.setAttribute('data-carousel', 'true');
      (carouselElement as any)._goToPrevious = goToPrevious;
      (carouselElement as any)._goToNext = goToNext;
    }
  }, []);

  return (
    <div 
      className="relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Container do carrossel */}
      <div 
        className="overflow-hidden py-4 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={carouselRef}
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${(currentIndex * 200) + dragOffset}px)`,
            width: `${duplicatedActions.length * 200}px`
          }}
        >
          {duplicatedActions.map((action, index) => (
            <div
              key={`${action.label}-${index}`}
              className="flex-shrink-0 w-48 px-2"
            >
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-3 hover:bg-gray-50 w-full transition-colors duration-200 hover:shadow-md"
                onClick={() => setLocation(action.href)}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  action.label === 'Pressão' ? 'bg-red-100' :
                  action.label === 'Glicemia' ? 'bg-blue-100' :
                  action.label === 'Batimentos' ? 'bg-rose-100' :
                  action.label === 'Temperatura' ? 'bg-orange-100' :
                  action.label === 'Peso' ? 'bg-violet-100' :
                  action.label === 'Remédios' ? 'bg-emerald-100' :
                  action.label === 'Consultas' ? 'bg-indigo-100' :
                  action.label === 'Receitas' ? 'bg-cyan-100' :
                  action.label === 'Exames' ? 'bg-yellow-100' :
                  action.label === 'Relatórios' ? 'bg-amber-100' : 'bg-gray-100'
                }`}>
                  <action.icon className={`w-6 h-6 ${
                    action.label === 'Pressão' ? 'text-red-600' :
                    action.label === 'Glicemia' ? 'text-blue-600' :
                    action.label === 'Batimentos' ? 'text-rose-600' :
                    action.label === 'Temperatura' ? 'text-orange-600' :
                    action.label === 'Peso' ? 'text-violet-600' :
                    action.label === 'Remédios' ? 'text-emerald-600' :
                    action.label === 'Consultas' ? 'text-indigo-600' :
                    action.label === 'Receitas' ? 'text-cyan-600' :
                    action.label === 'Exames' ? 'text-yellow-600' :
                    action.label === 'Relatórios' ? 'text-amber-600' : 'text-gray-600'
                  }`} />
                </div>
                <span className="text-sm font-medium text-center">{action.label}</span>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Componente Dashboard Médico
function DoctorDashboard() {
  const { user } = useAuth();
  const { selectedPatient } = usePatient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Função helper para criar URLs com contexto de paciente
  const createUrlWithPatientContext = (basePath: string, patientId?: number) => {
    const targetPatientId = patientId || selectedPatient?.id;
    if (!targetPatientId) return basePath;
    
    // Verificar se a URL já tem parâmetros
    const separator = basePath.includes('?') ? '&' : '?';
    return `${basePath}${separator}patient=${targetPatientId}`;
  };

  // Queries para consultas e exames (médicos veem todos os dados)
  const { data: appointments = [] } = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: async () => {
      const response = await api.get('/appointments');
      return Array.isArray(response.data) ? response.data : [];
    }
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['doctor-tests'],
    queryFn: async () => {
      const response = await api.get('/tests');
      return Array.isArray(response.data) ? response.data : [];
    }
  });

  // Filtrar consultas e exames pela data selecionada
  const today = new Date();
  const filteredAppointments = appointments.filter((appointment: DoctorAppointment) => {
    const appointmentDate = new Date(appointment.appointmentDate);
    return format(appointmentDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
  });

  const filteredTests = tests.filter((test: DoctorTest) => {
    const testDate = new Date(test.testDate);
    return format(testDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
  });

  // Calcular estatísticas do dashboard
  const dashboardStats: DashboardStats = {
    totalPatients: new Set([
      ...appointments.map((a: DoctorAppointment) => a.patientId), 
      ...tests.map((t: DoctorTest) => t.patientId)
    ]).size || 0,
    todayAppointments: appointments.filter((a: DoctorAppointment) => isToday(new Date(a.appointmentDate))).length,
    todayTests: tests.filter((t: DoctorTest) => isToday(new Date(t.testDate))).length,
    pendingResults: tests.filter((t: DoctorTest) => t.status === 'scheduled' || t.status === 'in_progress').length,
    urgentNotifications: 3
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { label: "Agendado", variant: "secondary" as const },
      confirmed: { label: "Confirmado", variant: "default" as const },
      completed: { label: "Concluído", variant: "outline" as const },
      cancelled: { label: "Cancelado", variant: "destructive" as const },
      in_progress: { label: "Em Andamento", variant: "default" as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: "secondary" as const };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">Total sob cuidados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas Hoje</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">Agendadas para hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exames Hoje</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.todayTests}</div>
            <p className="text-xs text-muted-foreground">Programados para hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultados Pendentes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.pendingResults}</div>
            <p className="text-xs text-muted-foreground">Aguardando análise</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dashboardStats.urgentNotifications}</div>
            <p className="text-xs text-muted-foreground">Requerem atenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consultas e Exames do Dia */}
        <div className="lg:col-span-2 space-y-6">
          {/* Consultas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Stethoscope size={20} />
                <span>Consultas - {getDateLabel(selectedDate)}</span>
              </CardTitle>
              <CardDescription>
                {filteredAppointments.length} consulta(s) agendada(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {filteredAppointments.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    <div className="text-center">
                      <Stethoscope className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>Nenhuma consulta agendada para este dia</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAppointments.map((appointment: DoctorAppointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{appointment.description}</h4>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <span className="flex items-center space-x-1">
                              <Clock size={14} />
                              <span>{format(new Date(appointment.appointmentDate), "HH:mm")}</span>
                            </span>
                            {appointment.location && (
                              <span>📍 {appointment.location}</span>
                            )}
                          </div>
                          {appointment.notes && (
                            <p className="text-sm text-gray-600 mt-1">{appointment.notes}</p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={createUrlWithPatientContext("/appointments", appointment.patientId)}>Ver Detalhes</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Exames */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FlaskConical size={20} />
                <span>Exames - {getDateLabel(selectedDate)}</span>
              </CardTitle>
              <CardDescription>
                {filteredTests.length} exame(s) programado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {filteredTests.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    <div className="text-center">
                      <FlaskConical className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>Nenhum exame programado para este dia</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTests.map((test: DoctorTest) => (
                      <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{test.type}</h4>
                            {getStatusBadge(test.status)}
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <span className="flex items-center space-x-1">
                              <Clock size={14} />
                              <span>{format(new Date(test.testDate), "HH:mm")}</span>
                            </span>
                            {test.location && (
                              <span>📍 {test.location}</span>
                            )}
                          </div>
                          {test.notes && (
                            <p className="text-sm text-gray-600 mt-1">{test.notes}</p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={createUrlWithPatientContext("/tests", test.patientId)}>Ver Detalhes</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <div className="space-y-6">
          {/* Calendário de Seleção de Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarIcon size={20} />
                <span>Selecionar Data</span>
              </CardTitle>
              <CardDescription>
                Escolha uma data para ver consultas e exames
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                disabled={(date) =>
                  date > new Date("2030-01-01") || date < new Date("2020-01-01")
                }
                modifiers={{
                  today: selectedDate?.toDateString() === new Date().toDateString() ? new Date() : undefined
                }}
                modifiersStyles={{
                  today: {
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    fontWeight: 'bold'
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>Acesso direto às funcionalidades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={createUrlWithPatientContext("/appointments?tab=appointments&action=new")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Nova Consulta
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={createUrlWithPatientContext("/tests?tab=requisicoes&action=new")}>
                  <FlaskConical className="mr-2 h-4 w-4" />
                  Solicitar Exame
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={createUrlWithPatientContext("/prescriptions?action=new")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Nova Receita
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={createUrlWithPatientContext("/medications")}>
                  <Pill className="mr-2 h-4 w-4" />
                  Gerenciar Medicamentos
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Resumo de Atividades */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity size={20} />
                <span>Atividade Recente</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>3 consultas realizadas hoje</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span>2 resultados de exames analisados</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span>5 medicamentos prescritos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { selectedPatient, setSelectedPatient, isPatientSelected, canHaveOwnMedicalData } = usePatient();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  // Estados sempre declarados - ordem consistente dos hooks
  const [loadingMedications, setLoadingMedications] = useState<Record<number, boolean>>({});
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [selectedMedicationLog, setSelectedMedicationLog] = useState<any>(null);
  const [showHistoryInline, setShowHistoryInline] = useState(false);
  const [isOverdueModal, setIsOverdueModal] = useState(false);
  const [confirmingAppointmentId, setConfirmingAppointmentId] = useState<number | null>(null);
  const [confirmingTestId, setConfirmingTestId] = useState<number | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<'completed' | 'cancelled' | null>(null);

  // ⚡ LAZY QUERIES - sempre chamadas antes de qualquer lógica condicional
  const { 
    medications: medicationsQuery, 
    todayLogs: todayLogsQuery, 
    appointments: appointmentsQuery, 
    tests: testsQuery, 
    notifications: notificationsQuery,
    medicationLogs: medicationLogsQuery,
    enableMedicalQueries 
  } = useLazyMedicalQueries();

  // 🔄 Real-time checker - sempre chamado
  useRealTimeChecker();

  // ⚠️ HOOKS DE MUTAÇÃO - DEVEM VIR ANTES DOS EARLY RETURNS ⚠️
  // Mutação para confirmar compromissos (consultas)
  const confirmAppointmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'completed' | 'cancelled' }) => {
      const response = await api.put(`/api/appointments/${id}`, { status });
      return response.data;
    },
    onMutate: ({ id, status }) => {
      setConfirmingAppointmentId(id);
      setConfirmingAction(status);
    },
    onSuccess: (_, { status }) => {
      setConfirmingAppointmentId(null);
      setConfirmingAction(null);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: status === 'completed' ? "Consulta confirmada" : "Consulta cancelada",
        description: status === 'completed' ? 
          "A consulta foi marcada como realizada." : 
          "A consulta foi marcada como cancelada.",
      });
    },
    onError: () => {
      setConfirmingAppointmentId(null);
      setConfirmingAction(null);
      toast({
        title: "Erro",
        description: "Erro ao confirmar consulta. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutação para confirmar exames
  const confirmTestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'completed' | 'cancelled' }) => {
      const response = await api.put(`/api/tests/${id}`, { status });
      return response.data;
    },
    onMutate: ({ id, status }) => {
      setConfirmingTestId(id);
      setConfirmingAction(status);
    },
    onSuccess: (_, { status }) => {
      setConfirmingTestId(null);
      setConfirmingAction(null);
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      toast({
        title: status === 'completed' ? "Exame confirmado" : "Exame cancelado",
        description: status === 'completed' ? 
          "O exame foi marcado como realizado." : 
          "O exame foi marcado como cancelado.",
      });
    },
    onError: () => {
      setConfirmingTestId(null);
      setConfirmingAction(null);
      toast({
        title: "Erro",
        description: "Erro ao confirmar exame. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Add medication mutation
  const addMedicationMutation = useMutation({
    mutationFn: async (medicationData: any) => {
      const response = await api.post("/api/medications", medicationData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
    },
  });

  // Confirm medication mutation
  const confirmMedicationMutation = useMutation({
    mutationFn: async (logId: number) => {
      const response = await api.put(`/api/medication-logs/${logId}`, {
        status: "taken",
        actualDateTime: new Date(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-logs/today"] });
      toast({
        title: "Medicamento confirmado",
        description: "O medicamento foi marcado como tomado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao confirmar medicamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // useEffect para verificar parâmetros da URL (MOVIDO PARA ANTES DOS EARLY RETURNS)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const openHistoryId = urlParams.get('openHistory');
    const isOverdue = urlParams.get('isOverdue') === 'true';
    const isEarly = urlParams.get('isEarly') === 'true';

    if (openHistoryId && todayLogsQuery.data?.length > 0) {
      const logId = parseInt(openHistoryId);
      const log = todayLogsQuery.data.find((l: any) => l.id === logId);

      if (log) {
        // Adicionar flag de antecedência se necessário
        if (isEarly) {
          log.isEarly = true;
        }

        handleOpenHistory(log, isOverdue);

        // Limpar parâmetros da URL sem recarregar a página
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [todayLogsQuery.data, medicationsQuery.data]);

  // Determinar shouldEnableQueries ANTES de qualquer lógica condicional
  const shouldEnableQueries = useMemo(() => {
    if (!user) return false;

    // Para pacientes e cuidadores: sempre habilitar
    if (user.profileType === 'patient' || user.profileType === 'caregiver') {
      return true;
    }

    // Para médicos: habilitar se há paciente selecionado (independente da rota)
    if (user.profileType === 'doctor') {
      return Boolean(selectedPatient);
    }

    // Para outros tipos: apenas se há paciente selecionado
    return Boolean(selectedPatient);
  }, [user, selectedPatient]);

  // Determinar qual interface mostrar ANTES de qualquer redirecionamento
  const interfaceType = useMemo(() => {
    if (!user) return 'loading';
    
    if (user.profileType === 'doctor') {
      if (location === '/home') {
        return 'doctor_dashboard';
      } else if (location === '/visao-geral') {
        return selectedPatient ? 'patient_view' : 'needs_patient_selection';
      }
    }
    return 'patient_view'; // Para todos os outros casos
  }, [user, location, selectedPatient]);

  // Redirecionamentos em useEffect para evitar mudança durante render
  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    // Se é médico em /visao-geral sem paciente selecionado, aguardar um pouco antes de redirecionar
    // para permitir que o contexto do paciente seja carregado
    if (user.profileType === 'doctor' && location === '/visao-geral' && !selectedPatient) {
      // Aguardar um pouco para permitir que o contexto do paciente seja carregado
      const timeoutId = setTimeout(() => {
        console.log("🔄 Médico em /visao-geral sem paciente - redirecionando para /home após timeout");
        setLocation("/home");
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, location, selectedPatient, setLocation]);

  // Verificar parâmetro de paciente na URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patient');

    if (patientId && user && (user.profileType === 'caregiver' || user.profileType === 'doctor')) {
      const numericPatientId = parseInt(patientId);
      if (!isNaN(numericPatientId) && (!selectedPatient || selectedPatient.id !== numericPatientId)) {
        console.log(`Switching to patient ${numericPatientId} from URL parameter`);
      }
    }
  }, [user, selectedPatient]);

  // Early returns para casos especiais
  if (!user || interfaceType === 'loading') {
    return null;
  }

  if (interfaceType === 'needs_patient_selection') {
    return null; // O useEffect vai redirecionar
  }

  // Se é dashboard médico, renderizar dashboard
  if (interfaceType === 'doctor_dashboard') {
    return (
      <div className="h-full flex flex-col">
        <DoctorDashboard />
        <BottomNavigation />
      </div>
    );
  }

  // Extrair dados das queries
  const medications = medicationsQuery.data || [];
  const todayLogs = todayLogsQuery.data || [];
  const appointments = appointmentsQuery.data || [];
  const tests = testsQuery.data || [];
  const notifications = notificationsQuery.data || [];
  const medicationLogs = medicationLogsQuery.data || [];

  // 🧵 Estados de carregamento para skeleton loading
  const isLoadingMedicalData = 
    medicationsQuery.isLoading || 
    todayLogsQuery.isLoading || 
    appointmentsQuery.isLoading || 
    testsQuery.isLoading || 
    medicationLogsQuery.isLoading;

  // ⚡ Otimização aplicada - dados vêm das lazy queries

  // ⚡ Dados de aderência vêm das lazy queries

  // ⚡ Medicamentos vêm das lazy queries

  // ⚡ Notificações vêm das lazy queries

  // ⚡ Consultas vêm das lazy queries

  // ⚡ Exames vêm das lazy queries

  // Funções de status para compromissos
  const getAppointmentStatus = (appointment: any) => {
    const appointmentDate = new Date(appointment.appointmentDate);
    const correctedAppointmentDate = new Date(appointmentDate.getTime() + (3 * 60 * 60 * 1000));
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDay = new Date(correctedAppointmentDate);
    appointmentDay.setHours(0, 0, 0, 0);

    // Se já tem status definido como realizada ou cancelada
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return appointment.status;
    }

    // Se é hoje
    if (appointmentDay.getTime() === today.getTime()) {
      // Verifica se já passou do horário (com 15 minutos de tolerância)
      const toleranceMs = 15 * 60 * 1000; // 15 minutos em milliseconds
      if (now.getTime() > (correctedAppointmentDate.getTime() + toleranceMs)) {
        return 'overdue'; // Passou do horário, precisa confirmar
      }
      return 'today'; // É hoje mas ainda não passou
    }

    // Se é no futuro
    if (appointmentDay > today) {
      return 'scheduled';
    }

    // Se é no passado e não foi confirmada
    return 'missed';
  };

  const getTestStatus = (test: any) => {
    const testDate = new Date(test.testDate);
    const correctedTestDate = new Date(testDate.getTime() + (3 * 60 * 60 * 1000));
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const testDay = new Date(correctedTestDate);
    testDay.setHours(0, 0, 0, 0);

    // Se já tem status definido como realizado ou cancelado
    if (test.status === 'completed' || test.status === 'cancelled') {
      return test.status;
    }

    // Se é hoje
    if (testDay.getTime() === today.getTime()) {
      // Verifica se já passou do horário (com 15 minutos de tolerância)
      const toleranceMs = 15 * 60 * 1000; // 15 minutos em milliseconds
      if (now.getTime() > (correctedTestDate.getTime() + toleranceMs)) {
        return 'overdue'; // Passou do horário, precisa confirmar
      }
      return 'today'; // É hoje mas ainda não passou
    }

    // Se é no futuro
    if (testDay > today) {
      return 'scheduled';
    }

    // Se é no passado e não foi confirmado
    return 'missed';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'today':
        return "bg-red-500 text-white animate-pulse border-red-600";
      case 'scheduled':
        return "bg-blue-100 text-blue-800";
      case 'completed':
        return "bg-green-100 text-green-800";
      case 'cancelled':
        return "bg-red-100 text-red-800";
      case 'overdue':
        return "bg-yellow-100 text-yellow-800";
      case 'missed':
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'today': return 'Hoje';
      case 'scheduled': return 'Agendado';
      case 'completed': return 'Realizado';
      case 'cancelled': return 'Cancelado';
      case 'overdue': return 'Atrasado';
      case 'missed': return 'Perdido';
      default: return 'Pendente';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'today':
      case 'scheduled': return <Timer className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      case 'overdue': return <AlertCircle className="w-3 h-3" />;
      case 'missed': return <XCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const shouldShowConfirmationButtons = (item: any, type: 'appointment' | 'test') => {
    const status = type === 'appointment' ? getAppointmentStatus(item) : getTestStatus(item);
    return status === 'overdue';
  };

  // ⚠️ HOOKS DUPLICADOS REMOVIDOS - AGORA ESTÃO ANTES DOS EARLY RETURNS ⚠️

  const handleTakeMedication = async (logId: number) => {
    if (!logId) return;

    // Buscar o log específico para verificar se é atrasado ou muito antecipado
    const log = todayLogs.find((l: any) => l.id === logId);
    if (!log) return;

    // Se for medicamento atrasado, abrir modal de histórico
    if (log.status === 'overdue') {
      handleOpenHistory(log, true); // true indica que é medicamento atrasado
      return;
    }

    // Verificar se o medicamento está sendo tomado muito antes do horário
    const now = new Date();
    const scheduledTime = new Date(log.scheduledDateTime);
    const minutesEarly = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);

    // Se está sendo tomado mais de 60 minutos antes do horário, pedir motivo da antecedência
    if (minutesEarly > 60) {
      // Adicionar flag para indicar que é antecipado e abrir modal de histórico
      const logWithEarlyFlag = { ...log, isEarly: true };
      handleOpenHistory(logWithEarlyFlag, false); // false = não é atrasado, mas sim antecipado
      return;
    }

    setLoadingMedications(prev => ({ ...prev, [logId]: true }));

    try {
      // Criar data atual sem conversão de timezone
      const now = new Date();

      // Marcar como tomado com horário atual (o backend vai ajustar)
      const response = await api.put(`/api/medication-logs/${logId}`, {
        status: 'taken',
        actualDateTime: now.toISOString(),
        confirmedBy: user?.id,
      });

      // Recarregar os dados
      await queryClient.invalidateQueries({ queryKey: ['/api/medication-logs/today'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/medication-logs'] });

      toast({
        title: "Medicamento tomado!",
        description: "O horário foi registrado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível registrar a tomada do medicamento.",
        variant: "destructive",
      });
    } finally {
      setLoadingMedications(prev => ({ ...prev, [logId]: false }));
    }
  };

  const handleAddMedication = async (medicationData: any) => {
    await addMedicationMutation.mutateAsync(medicationData);
  };

  const handleOpenHistory = (log: any, isOverdue: boolean = false) => {
    // O log já vem com as informações do medicamento do backend
    // Se não tiver, buscar na lista de medicamentos das lazy queries
    if (!log.medication || !log.medication.name || log.medication.name === 'Medicamento não encontrado') {
      const medication = medications?.find((med: any) => med.id === log.medicationId);
      log.medication = medication || { name: 'Medicamento não encontrado', dosage: '' };
    }

    setSelectedMedicationLog(log);
    setIsOverdueModal(isOverdue);
    setShowHistoryInline(true);
  };

  const handleCloseHistory = () => {
    setShowHistoryInline(false);
    setSelectedMedicationLog(null);
    setIsOverdueModal(false);
  };



  // Calculate real adherence data from medication logs
  const calculateAdherenceData = () => {
    const weeklyLogs = medicationLogs || [];
    if (!weeklyLogs.length) {
      return {
        weeklyData: [0, 0, 0, 0, 0, 0, 0],
        overallPercentage: 0,
        trend: 0,
      };
    }

    // Get last 7 days data organizados por dia da semana (S,T,Q,Q,S,S,D)
    const weeklyData = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Final do dia atual

    // Ordem dos dias no gráfico: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] = [0,1,2,3,4,5,6]
    const dayOrder = [0, 1, 2, 3, 4, 5, 6]; // Domingo a Sábado

    for (const targetWeekday of dayOrder) {
      // Encontrar o dia mais recente que corresponde a este dia da semana
      let targetDate = new Date(today);

      // Calcular quantos dias voltar para chegar ao dia da semana desejado
      let daysBack = (today.getDay() - targetWeekday + 7) % 7;
      if (daysBack === 0 && today.getDay() !== targetWeekday) {
        daysBack = 7; // Se é hoje mas não é o dia certo, voltar uma semana
      }

      targetDate.setDate(targetDate.getDate() - daysBack);
      targetDate.setHours(0, 0, 0, 0); // Início do dia

      // Filter logs for this specific day using only the date part
      const dayLogs = weeklyLogs.filter((log: any) => {
        const logDate = new Date(log.scheduledDateTime || log.scheduled_date_time);

        // Usar apenas a parte da data para comparação, ignorando horário
        const logDateStr = logDate.toISOString().split('T')[0];
        const targetDateStr = targetDate.toISOString().split('T')[0];

        return logDateStr === targetDateStr;
      });

      if (dayLogs.length === 0) {
        weeklyData.push(0); // No medications scheduled = 0% (no data)
      } else {
        const takenCount = dayLogs.filter((log: any) => log.status === 'taken').length;
        const adherencePercentage = Math.round((takenCount / dayLogs.length) * 100);
        weeklyData.push(adherencePercentage);
      }
    }

    // Calculate overall percentage for the week - usar mesma lógica dos relatórios
    const totalLogs = weeklyLogs.length;
    const takenLogs = weeklyLogs.filter((log: any) => log.status === 'taken').length;

    // Aplicar mesma lógica de medicamentos perdidos dos relatórios
    const nowUTC = new Date();
    const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
    const todayStr = new Date(nowBrasil.getTime()).toISOString().split('T')[0]; // YYYY-MM-DD

    // Filtrar logs para últimos 7 dias (mesma lógica dos relatórios)
    const sevenDaysAgo = new Date(nowBrasil);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const weekLogs = weeklyLogs.filter((log: any) => {
      const logDateStr = log.scheduledDateTime.split('T')[0]; // YYYY-MM-DD
      return logDateStr >= sevenDaysAgoStr && logDateStr <= todayStr;
    });

    const weekTotalLogs = weekLogs.length;
    const weekTakenLogs = weekLogs.filter((log: any) => log.status === 'taken').length;
    const overallPercentage = weekTotalLogs > 0 ? Math.round((weekTakenLogs / weekTotalLogs) * 100) : 0;

    // Calculate trend (comparison between first half and second half of week)
    const firstHalf = weeklyData.slice(0, 3);
    const secondHalf = weeklyData.slice(4, 7);
    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
    const trend = Math.round(secondAvg - firstAvg);

    return {
      weeklyData,
      overallPercentage,
      trend,
    };
  };

  const adherenceData = calculateAdherenceData();

  // ⚠️ useEffect MOVIDO PARA ANTES DOS EARLY RETURNS ⚠️

  const unreadNotifications = (Array.isArray(notifications?.notifications) ? notifications.notifications : []).filter((n: any) => !n.isRead).length;

  // Filter upcoming appointments (today and future)
  const todayBrasil = new Date();
  todayBrasil.setHours(0, 0, 0, 0);

  const upcomingAppointments = (appointments || [])
    .filter((appointment: any) => {
      if (!appointment.appointmentDate) return false;

      const appointmentDate = new Date(appointment.appointmentDate);
      const appointmentDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());

      // Incluir apenas consultas de hoje em diante e com status 'scheduled'
      return appointmentDateOnly >= todayBrasil && 
             appointment.status === 'scheduled' &&
             appointment.doctorName && 
             appointment.title;
    })
    .sort((a: any, b: any) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());

  // Filter upcoming tests (today and future)
  const upcomingTests = (tests || [])
    .filter((test: any) => {
      if (!test.testDate) return false;

      const testDate = new Date(test.testDate);
      const testDateOnly = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate());

      // Incluir apenas exames de hoje em diante que ainda não foram realizados (sem arquivo de resultado)
      return testDateOnly >= todayBrasil && 
             !test.filePath &&
             test.name && 
             test.type;
    })
    .sort((a: any, b: any) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime());



  // 🧵 Mostrar skeleton loading quando dados médicos estão carregando
  // Para médicos visualizando prontuário, também mostrar loading
  if (interfaceType === 'patient_view' && shouldEnableQueries && enableMedicalQueries && isLoadingMedicalData) {
    // Mobile loading - mostrar header e menu inferior imediatamente
    if (isMobile) {
      return (
        <div className="mobile-container">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40">
            <div className="flex items-center justify-between">
              {/* Left side - User info or Patient selector for caregivers */}
              {user && user.profileType === 'caregiver' ? (
                <div data-patient-selector>
                  <PatientSelector 
                    currentPatient={selectedPatient ? { 
                      id: selectedPatient.id, 
                      name: selectedPatient.name, 
                      email: selectedPatient.email, 
                      age: selectedPatient.age, 
                      photo: selectedPatient.photo, 
                      profileType: 'patient' as const 
                    } : user ? { 
                      id: user.id, 
                      name: user.name, 
                      email: user.email, 
                      age: user.age ?? undefined, 
                      photo: user.photo ?? undefined, 
                      profileType: user.profileType as 'patient' | 'caregiver' | 'doctor' | 'family' | 'nurse'
                    } : undefined} 
                    onPatientChange={(patient) => setSelectedPatient(patient)}
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user?.photo || ""} alt={user?.name} />
                    <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-lg font-semibold text-slate-800">{user?.name}</h1>
                    <div className="flex items-center gap-2">
                      {user?.age && (
                        <p className="text-sm text-slate-500">{user.age} anos</p>
                      )}
                      <Badge 
                        variant={user?.profileType === 'patient' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {user?.profileType === 'patient' ? 'Paciente' : 
                         user?.profileType === 'caregiver' ? 'Cuidador(a)' :
                         user?.profileType === 'doctor' ? 'Médico(a)' :
                         user?.profileType === 'family' ? 'Familiar' :
                         user?.profileType === 'nurse' ? 'Enfermagem' : 'Usuário'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Right side - Notifications and Settings */}
              <div className="flex items-center space-x-2">
                <NotificationsPanel />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setLocation('/settings')}
                >
                  <User className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main content com preloader */}
          <main className="flex-1 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </main>

          {/* Bottom Navigation */}
          <BottomNavigation />
        </div>
      );
    }

    // Desktop skeleton loading
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 flex-1 overflow-auto">
          {/* Skeleton para métricas principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
                    </div>
                    <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Skeleton para grid principal - Medicamentos e Compromissos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Skeleton Medicamentos de hoje */}
            <Card>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-48"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Skeleton Próximos compromissos */}
            <Card>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-48"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Skeleton para Ações rápidas */}
          <Card className="mb-6">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>

          {/* Skeleton para Gráfico de aderência */}
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse w-40"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: Activity, label: "Pressão", color: "bg-red-500", href: "/vital-signs?tab=pressure" },
    { icon: Droplets, label: "Glicemia", color: "bg-blue-500", href: "/vital-signs?tab=glucose" },
    { icon: Heart, label: "Batimentos", color: "bg-rose-500", href: "/vital-signs?tab=heart-rate" },
    { icon: Thermometer, label: "Temperatura", color: "bg-orange-500", href: "/vital-signs?tab=temperature" },
    { icon: Weight, label: "Peso", color: "bg-violet-500", href: "/vital-signs?tab=weight" },
    { icon: Pill, label: "Remédios", color: "bg-emerald-500", href: "/medications" },
    { icon: CalendarIcon, label: "Consultas", color: "bg-indigo-500", href: "/appointments" },
    { icon: FileText, label: "Receitas", color: "bg-cyan-500", href: "/medications?tab=prescriptions" },
    { icon: FlaskConical, label: "Exames", color: "bg-purple-500", href: "/tests" },
    { icon: BarChart3, label: "Relatórios", color: "bg-amber-500", href: "/reports" },
  ];

  // Layout Mobile
  if (isMobile) {
    return (
      <div className="mobile-container">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          {/* Left side - User info or Patient selector for caregivers */}
          {user && user.profileType === 'caregiver' ? (
            <div data-patient-selector>
              <PatientSelector 
                currentPatient={selectedPatient ? { 
                  id: selectedPatient.id, 
                  name: selectedPatient.name, 
                  email: selectedPatient.email, 
                  age: selectedPatient.age, 
                  photo: selectedPatient.photo, 
                  profileType: 'patient' as const 
                } : user ? { 
                  id: user.id, 
                  name: user.name, 
                  email: user.email, 
                  age: user.age ?? undefined, 
                  photo: user.photo ?? undefined, 
                  profileType: user.profileType as 'patient' | 'caregiver' | 'doctor' | 'family' | 'nurse'
                } : undefined} 
                onPatientChange={(patient) => setSelectedPatient(patient)}
              />
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user?.photo || ""} alt={user?.name} />
                <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold text-slate-800">{user?.name}</h1>
                <Badge 
                  variant={user?.profileType === 'patient' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {user?.profileType === 'patient' ? 'Paciente' : 
                   user?.profileType === 'caregiver' ? 'Cuidador(a)' :
                   user?.profileType === 'doctor' ? 'Médico(a)' :
                   user?.profileType === 'family' ? 'Familiar' :
                   user?.profileType === 'nurse' ? 'Enfermagem' : 'Usuário'}
                </Badge>
              </div>
            </div>
          )}

          {/* Right side - Notifications and Settings */}
          <div className="flex items-center space-x-2">
            <NotificationsPanel />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation('/settings')}
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="pb-36">
        {/* Quick Actions Carousel */}
        <section className="py-6 gradient-bg">
          <div className="px-4 mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Ações Rápidas</h2>
          </div>

          <div 
            className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
            style={{ 
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch'
            }}
            onMouseDown={(e) => {
              const container = e.currentTarget as HTMLDivElement;
              const startX = e.pageX - container.offsetLeft;
              const scrollLeft = container.scrollLeft;
              let isDown = true;

              const handleMouseMove = (e: MouseEvent) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - container.offsetLeft;
                const walk = (x - startX) * 2;
                container.scrollLeft = scrollLeft - walk;
              };

              const handleMouseUp = () => {
                isDown = false;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >
            <div className="flex gap-3 px-4 pb-2" style={{ width: 'max-content' }}>
              {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className={`flex flex-col items-center p-3 h-auto bg-white shadow-sm hover:bg-slate-50 transition-colors w-20 ${
                      action.label === 'Pressão' ? 'hover:border-red-300' :
                      action.label === 'Glicemia' ? 'hover:border-blue-300' :
                      action.label === 'Batimentos' ? 'hover:border-rose-300' :
                      action.label === 'Temperatura' ? 'hover:border-orange-300' :
                      action.label === 'Peso' ? 'hover:border-violet-300' :
                      action.label === 'Remédios' ? 'hover:border-emerald-300' :
                      action.label === 'Consultas' ? 'hover:border-indigo-300' :
                      action.label === 'Receitas' ? 'hover:border-cyan-300' :
                      action.label === 'Exames' ? 'hover:border-yellow-300' :
                      action.label === 'Relatórios' ? 'hover:border-amber-300' : 'hover:border-gray-300'
                    }`}
                    onClick={() => setLocation(action.href)}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      action.label === 'Pressão' ? 'bg-red-100' :
                      action.label === 'Glicemia' ? 'bg-blue-100' :
                      action.label === 'Batimentos' ? 'bg-rose-100' :
                      action.label === 'Temperatura' ? 'bg-orange-100' :
                      action.label === 'Peso' ? 'bg-violet-100' :
                      action.label === 'Remédios' ? 'bg-emerald-100' :
                      action.label === 'Consultas' ? 'bg-indigo-100' :
                      action.label === 'Receitas' ? 'bg-cyan-100' :
                      action.label === 'Exames' ? 'bg-yellow-100' :
                      action.label === 'Relatórios' ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      {action.icon ? <action.icon className={`w-6 h-6 ${
                        action.label === 'Pressão' ? 'text-red-600' :
                        action.label === 'Glicemia' ? 'text-blue-600' :
                        action.label === 'Batimentos' ? 'text-rose-600' :
                        action.label === 'Temperatura' ? 'text-orange-600' :
                        action.label === 'Peso' ? 'text-violet-600' :
                        action.label === 'Remédios' ? 'text-emerald-600' :
                        action.label === 'Consultas' ? 'text-indigo-600' :
                        action.label === 'Receitas' ? 'text-cyan-600' :
                        action.label === 'Exames' ? 'text-yellow-600' :
                        action.label === 'Relatórios' ? 'text-amber-600' : 'text-gray-600'
                      }`} /> : null}
                    </div>
                    <span className="text-xs font-medium text-slate-700">{action.label}</span>
                  </Button>
                ))}
              {/* Main Actions */}
            </div>
          </div>
        </section>

        {/* Main content */}
        <>
            {/* Today's Medications */}
            <section className="px-4 py-6">
              {!showHistoryInline ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-800">Medicamentos de Hoje</h2>
                    <span className="text-sm text-slate-500">
                      {todayLogs.filter((log: any) => log.status === 'taken').length} de {todayLogs.length} tomados
                    </span>
                  </div>

                  <div className="space-y-3">
                {todayLogs.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-slate-500">Nenhum medicamento programado para hoje</p>
                </CardContent>
              </Card>
            ) : (
              // Ordenar por prioridade: atrasados primeiro, depois pendentes, depois tomados
              // Dentro de cada categoria, ordenar por horário
              todayLogs
                .sort((a: any, b: any) => {
                  // Primeiro ordenar por status (prioridade)
                  const statusPriority: { [key: string]: number } = { 'overdue': 1, 'pending': 2, 'taken': 3 };
                  const statusDiff = (statusPriority[a.status] || 4) - (statusPriority[b.status] || 4);
                  if (statusDiff !== 0) return statusDiff;

                  // Depois ordenar por horário programado
                  const timeA = new Date(a.scheduledDateTime).getTime();
                  const timeB = new Date(b.scheduledDateTime).getTime();
                  return timeA - timeB;
                })
                .map((log: any) => (
                <MedicationCard
                  key={log.id}
                  medication={{
                    id: log.id,
                    name: log.medication?.name || "Medicamento",
                    dosage: log.medication?.dosage || "",
                    scheduledTime: new Date(log.scheduledDateTime).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      timeZone: 'UTC'
                    }),
                    actualTime: log.actualDateTime ? new Date(log.actualDateTime).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      timeZone: 'UTC'
                    }) : undefined,
                    status: log.status,
                    delayMinutes: (log.delayMinutes !== undefined && log.delayMinutes !== null) ? log.delayMinutes : (() => {
                      if (!log.actualDateTime) return 0;

                      const scheduled = new Date(log.scheduledDateTime);
                      const actual = new Date(log.actualDateTime);
                      const diffMs = actual.getTime() - scheduled.getTime();
                      return Math.floor(diffMs / (1000 * 60));
                    })(),
                    isEarly: (log.delayMinutes || 0) < 0,
                  }}
                  log={log}
                  onTake={handleTakeMedication}
                  onOpenHistory={handleOpenHistory}
                  isLoading={loadingMedications[log.id] || false}
                />
              ))
            )}
              </div>
            </>
          ) : (
            /* Histórico inline substituindo a lista de medicamentos */
            selectedMedicationLog && (
              <MedicationHistoryInline
                log={selectedMedicationLog}
                onClose={handleCloseHistory}
                isOverdue={isOverdueModal}
              />
            )
          )}
        </section>


        </>

        {/* Adherence Chart */}
        <section className="px-4 py-6 bg-slate-50">
          <AdherenceChart {...adherenceData} />
        </section>

        {/* Upcoming Tests */}
        <section className="px-4 py-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Próximos Exames</h2>

          <div className="space-y-3">
            {upcomingTests.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FlaskConical className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    Nenhum exame agendado
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Agende seus exames para manter sua saúde em dia
                  </p>
                  <Button 
                    onClick={() => setLocation('/tests')}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agendar Exame
                  </Button>
                </CardContent>
              </Card>
            ) : (
              upcomingTests.map((test: any) => (
                <Card 
                  key={test.id} 
                  className="bg-purple-50 border-purple-200"
                >
                <CardContent className="p-4">
                  <div 
                    className="flex items-center space-x-3 cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={() => setLocation(`/tests?edit=${test.id}`)}
                  >
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <FlaskConical className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800">{test.name}</h3>
                        <Badge className={getStatusColor(getTestStatus(test))}>
                          {getStatusIcon(getTestStatus(test))}
                          <span className="ml-1">{getStatusLabel(getTestStatus(test))}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">{test.type}</p>
                      <p className="text-xs text-slate-600">
                        {(() => {
                          const date = new Date(test.testDate);
                          const correctedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
                          return format(correctedDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                        })()}
                      </p>
                      {test.location && (
                        <p className="text-xs text-slate-500">{test.location}</p>
                      )}
                    </div>
                  </div>

                  {/* Botões de confirmação para exames que passaram do horário */}
                  {shouldShowConfirmationButtons(test, 'test') && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 mb-2">
                        Este exame já passou do horário. Ele foi realizado?
                      </p>
                      <div className="flex gap-2 w-full">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmTestMutation.mutate({ id: test.id, status: 'completed' });
                          }}
                          disabled={confirmingTestId === test.id}
                          className="bg-green-600 hover:bg-green-700 text-white flex-1"
                        >
                          {confirmingTestId === test.id && confirmingAction === 'completed' ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Confirmando...
                            </>
                          ) : (
                            "✓ Sim, foi realizado"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmTestMutation.mutate({ id: test.id, status: 'cancelled' });
                          }}
                          disabled={confirmingTestId === test.id}
                          className="border-red-300 text-red-700 hover:bg-red-50 flex-1"
                        >
                          {confirmingTestId === test.id && confirmingAction === 'cancelled' ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                              Cancelando...
                            </>
                          ) : (
                            "✗ Não foi realizada"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              ))
            )}
          </div>
        </section>

        {/* Upcoming Appointments */}
        <section className="px-4 py-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Próximas Consultas</h2>

          <div className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarIcon className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    Nenhuma consulta agendada
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Agende suas consultas médicas para manter sua saúde em dia
                  </p>
                  <Button 
                    onClick={() => setLocation('/appointments')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agendar Consulta
                  </Button>
                </CardContent>
              </Card>
            ) : (
              upcomingAppointments.map((appointment: any) => (
                <Card 
                  key={appointment.id} 
                  className="bg-indigo-50 border-indigo-200"
                >
                <CardContent className="p-4">
                  <div 
                    className="flex items-center space-x-3 cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={() => setLocation(`/appointments?edit=${appointment.id}`)}
                  >
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <CalendarIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800">{appointment.doctorName}</h3>
                        <Badge className={getStatusColor(getAppointmentStatus(appointment))}>
                          {getStatusIcon(getAppointmentStatus(appointment))}
                          <span className="ml-1">{getStatusLabel(getAppointmentStatus(appointment))}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">{appointment.title}</p>
                      <p className="text-xs text-slate-600">
                        {(() => {
                          const date = new Date(appointment.appointmentDate);
                          const correctedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
                          return format(correctedDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                        })()}
                      </p>
                      {appointment.location && (
                        <p className="text-xs text-slate-500">{appointment.location}</p>
                      )}
                    </div>
                  </div>

                  {/* Botões de confirmação para consultas que passaram do horário */}
                  {shouldShowConfirmationButtons(appointment, 'appointment') && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 mb-2">
                        Esta consulta já passou do horário. Ela foi realizada?
                      </p>
                      <div className="flex gap-2 w-full">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmAppointmentMutation.mutate({ id: appointment.id, status: 'completed' });
                          }}
                          disabled={confirmingAppointmentId === appointment.id}
                          className="bg-green-600 hover:bg-green-700 text-white flex-1"
                        >
                          {confirmingAppointmentId === appointment.id && confirmingAction === 'completed' ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Confirmando...
                            </>
                          ) : (
                            "✓ Sim, foi realizada"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmAppointmentMutation.mutate({ id: appointment.id, status: 'cancelled' });
                          }}
                          disabled={confirmingAppointmentId === appointment.id}
                          className="border-red-300 text-red-700 hover:bg-red-50 flex-1"
                        >
                          {confirmingAppointmentId === appointment.id && confirmingAction === 'cancelled' ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                              Cancelando...
                            </>
                          ) : (
                            "✗ Não foi realizada"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-40 right-6 z-30">
        <AddDialog />
      </div>

      <BottomNavigation />
    </div>
    );
  }

  // Layout Desktop
  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="p-6 flex-1 overflow-auto">
        {/* Main desktop content */}
        <>
        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Medicamentos Hoje</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-gray-900">
                      {todayLogs.filter((log: any) => log.status === 'taken').length}
                    </p>
                    <span className="text-sm text-gray-500">/ {todayLogs.length}</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Pill className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aderência Semanal</p>
                  <p className="text-2xl font-bold text-gray-900">{adherenceData.overallPercentage}%</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Próximas Consultas</p>
                  <p className="text-2xl font-bold text-gray-900">{upcomingAppointments.length}</p>
                </div>
                <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Exames Pendentes</p>
                  <p className="text-2xl font-bold text-gray-900">{upcomingTests.length}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FlaskConical className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>



        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Medicamentos de hoje */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-[20px] pb-[20px]">
              <CardTitle className="text-lg font-semibold">Medicamentos de Hoje</CardTitle>
              <span className="text-sm text-gray-500">
                {todayLogs.filter((log: any) => log.status === 'taken').length} de {todayLogs.length} tomados
              </span>
            </CardHeader>
            <CardContent>
              {!showHistoryInline ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {todayLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                      <Timer className="h-12 w-12 mb-4 text-gray-400" />
                      <p>Nenhum medicamento programado para hoje</p>
                    </div>
                  ) : (
                    todayLogs
                      .sort((a: any, b: any) => {
                        const statusPriority: { [key: string]: number } = { 'overdue': 1, 'pending': 2, 'taken': 3 };
                        const statusDiff = (statusPriority[a.status] || 4) - (statusPriority[b.status] || 4);
                        if (statusDiff !== 0) return statusDiff;
                        const timeA = new Date(a.scheduledDateTime).getTime();
                        const timeB = new Date(b.scheduledDateTime).getTime();
                        return timeA - timeB;
                      })
                      .map((log: any) => (
                        <MedicationCard
                          key={log.id}
                          medication={{
                            id: log.id,
                            name: log.medication?.name || "Medicamento",
                            dosage: log.medication?.dosage || "",
                            scheduledTime: new Date(log.scheduledDateTime).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              timeZone: 'UTC'
                            }),
                            actualTime: log.actualDateTime ? new Date(log.actualDateTime).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              timeZone: 'UTC'
                            }) : undefined,
                            status: log.status,
                            delayMinutes: (log.delayMinutes !== undefined && log.delayMinutes !== null) ? log.delayMinutes : (() => {
                              if (!log.actualDateTime) return 0;
                              const scheduled = new Date(log.scheduledDateTime);
                              const actual = new Date(log.actualDateTime);
                              const diffMs = actual.getTime() - scheduled.getTime();
                              return Math.floor(diffMs / (1000 * 60));
                            })(),
                            isEarly: (log.delayMinutes || 0) < 0,
                          }}
                          log={log}
                          onTake={handleTakeMedication}
                          onOpenHistory={handleOpenHistory}
                          isLoading={loadingMedications[log.id] || false}
                        />
                      ))
                  )}
                </div>
              ) : (
                selectedMedicationLog && (
                  <MedicationHistoryInline
                    log={selectedMedicationLog}
                    onClose={handleCloseHistory}
                    isOverdue={isOverdueModal}
                  />
                )
              )}
            </CardContent>
          </Card>

          {/* Próximos compromissos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Próximos Compromissos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("space-y-4", selectedMedicationLog ? "max-h-none" : "max-h-96 overflow-y-auto")}>
                {upcomingAppointments.length === 0 && upcomingTests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                    <Timer className="h-12 w-12 mb-4 text-gray-400" />
                    <p>Nenhum compromisso próximo</p>
                  </div>
                ) : (
                  <>
                    {upcomingAppointments.slice(0, 3).map((appointment: any) => (
                      <div 
                        key={`appointment-${appointment.id}`}
                        className="p-3 rounded-lg border border-indigo-200 bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-colors"
                        onClick={() => setLocation(`/appointments?edit=${appointment.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <CalendarIcon className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-gray-900 truncate">{appointment.doctorName}</p>
                              <Badge className={getStatusColor(getAppointmentStatus(appointment))}>
                                {getStatusIcon(getAppointmentStatus(appointment))}
                                <span className="ml-1">{getStatusLabel(getAppointmentStatus(appointment))}</span>
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 truncate">{appointment.title}</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(new Date(appointment.appointmentDate).getTime() + (3 * 60 * 60 * 1000)), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>

                        {/* Botões de confirmação para consultas que passaram do horário */}
                        {shouldShowConfirmationButtons(appointment, 'appointment') && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800 mb-2">
                              Esta consulta já passou do horário. Ela foi realizada?
                            </p>
                            <div className="flex gap-2 w-full">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmAppointmentMutation.mutate({ id: appointment.id, status: 'completed' });
                                }}
                                disabled={confirmingAppointmentId === appointment.id}
                                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                              >
                                {confirmingAppointmentId === appointment.id && confirmingAction === 'completed' ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Confirmando...
                                  </>
                                ) : (
                                  "✓ Sim, foi realizada"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmAppointmentMutation.mutate({ id: appointment.id, status: 'cancelled' });
                                }}
                                disabled={confirmingAppointmentId === appointment.id}
                                className="border-red-300 text-red-700 hover:bg-red-50 flex-1"
                              >
                                {confirmingAppointmentId === appointment.id && confirmingAction === 'cancelled' ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                    Cancelando...
                                  </>
                                ) : (
                                  "✗ Não foi realizada"
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {upcomingTests.slice(0, 3).map((test: any) => (
                      <div 
                        key={`test-${test.id}`}
                        className="p-3 rounded-lg border border-purple-200 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors"
                        onClick={() => setLocation(`/tests?edit=${test.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <FlaskConical className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-gray-900 truncate">{test.name}</p>
                              <Badge className={getStatusColor(getTestStatus(test))}>
                                {getStatusIcon(getTestStatus(test))}
                                <span className="ml-1">{getStatusLabel(getTestStatus(test))}</span>
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 truncate">{test.type}</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(new Date(test.testDate).getTime() + (3 * 60 * 60 * 1000)), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>

                        {/* Botões de confirmação para exames que passaram do horário */}
                        {shouldShowConfirmationButtons(test, 'test') && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800 mb-2">
                              Este exame já passou do horário. Ele foirealizado?
                            </p>
                            <div className="flex gap-2 w-full">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmTestMutation.mutate({ id: test.id, status: 'completed' });
                                }}
                                disabled={confirmingTestId === test.id}
                                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                              >
                                {(confirmingTestId === test.id && confirmingAction === 'completed') ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Confirmando...
                                  </>
                                ) : (
                                  "✓ Sim, foi realizado"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmTestMutation.mutate({ id: test.id, status: 'cancelled' });
                                }}
                                disabled={confirmingTestId === test.id}
                                className="border-red-300 text-red-700 hover:bg-red-50 flex-1"
                              >
                                {(confirmingTestId === test.id && confirmingAction === 'cancelled') ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                    Cancelando...
                                  </>
                                ) : (
                                  "✗ Não foi realizada"
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Carrossel Infinito de Ações Rápidas */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {/* Botões de navegação nos cantos */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow-md"
              onClick={() => {
                const carousel = document.querySelector('[data-carousel]') as any;
                if (carousel && carousel._goToPrevious) carousel._goToPrevious();
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow-md"
              onClick={() => {
                const carousel = document.querySelector('[data-carousel]') as any;
                if (carousel && carousel._goToNext) carousel._goToNext();
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <InfiniteCarousel actions={quickActions} />
          </CardContent>
        </Card>

        {/* Gráfico de aderência - Largura total */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Aderência Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <AdherenceChart {...adherenceData} />
          </CardContent>
        </Card>
          </>
      </div>

      {/* Floating Action Button para desktop */}
      <div className="fixed bottom-6 right-6 z-30">
        <AddDialog />
      </div>
    </div>
  );
}