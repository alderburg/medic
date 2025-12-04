import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Stethoscope,
  FlaskConical,
  TrendingUp,
  Heart,
  Pill
} from "lucide-react";
import { format, isToday, isTomorrow, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  todayTests: number;
  pendingResults: number;
  urgentNotifications: number;
}

interface Appointment {
  id: number;
  description: string;
  date: string;
  status: string;
  location?: string;
  notes?: string;
}

interface Test {
  id: number;
  type: string;
  date: string;
  status: string;
  location?: string;
  notes?: string;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    todayTests: 0,
    pendingResults: 0,
    urgentNotifications: 0
  });

  // Buscar dados de consultas
  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: async () => {
      const response = await fetch('/api/appointments');
      if (!response.ok) throw new Error('Erro ao buscar consultas');
      return response.json();
    },
    initialData: []
  });

  // Buscar dados de exames
  const { data: tests } = useQuery<Test[]>({
    queryKey: ['tests'],
    queryFn: async () => {
      const response = await fetch('/api/tests');
      if (!response.ok) throw new Error('Erro ao buscar exames');
      return response.json();
    },
    initialData: []
  });

  // Filtrar dados para a data selecionada
  const selectedDateStart = startOfDay(selectedDate);
  const selectedDateEnd = endOfDay(selectedDate);

  const filteredAppointments = appointments?.filter((apt: Appointment) => {
    const aptDate = new Date(apt.date);
    return aptDate >= selectedDateStart && aptDate <= selectedDateEnd;
  }) || [];

  const filteredTests = tests?.filter((test: Test) => {
    const testDate = new Date(test.date);
    return testDate >= selectedDateStart && testDate <= selectedDateEnd;
  }) || [];

  // Calcular estatísticas
  useEffect(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const todayApts = appointments?.filter((apt: Appointment) => {
      const aptDate = new Date(apt.date);
      return aptDate >= todayStart && aptDate <= todayEnd;
    }).length || 0;

    const todayTestsCount = tests?.filter((test: Test) => {
      const testDate = new Date(test.date);
      return testDate >= todayStart && testDate <= todayEnd;
    }).length || 0;

    const pendingTestResults = tests?.filter((test: Test) => 
      test.status === 'scheduled' || test.status === 'in_progress'
    ).length || 0;

    setDashboardStats({
      totalPatients: 15, // TODO: Implementar contagem real de pacientes
      todayAppointments: todayApts,
      todayTests: todayTestsCount,
      pendingResults: pendingTestResults,
      urgentNotifications: 3 // TODO: Implementar contagem de notificações urgentes
    });
  }, [appointments, tests]);

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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Médico
          </h1>
          <p className="text-gray-600 mt-1">
            Bem-vindo, Dr. {user?.name}
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock size={16} />
          <span>{format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
        </div>
      </div>
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
            <CardTitle className="text-sm font-medium">Laudos Pendentes</CardTitle>
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
                    {filteredAppointments.map((appointment: Appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{appointment.description}</h4>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <span className="flex items-center space-x-1">
                              <Clock size={14} />
                              <span>{format(new Date(appointment.date), "HH:mm")}</span>
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
                          <Link href="/appointments">Ver Detalhes</Link>
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
                    {filteredTests.map((test: Test) => (
                      <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{test.type}</h4>
                            {getStatusBadge(test.status)}
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <span className="flex items-center space-x-1">
                              <Clock size={14} />
                              <span>{format(new Date(test.date), "HH:mm")}</span>
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
                          <Link href="/tests">Ver Detalhes</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Calendário e Ações Rápidas */}
        <div className="space-y-6">
          {/* Calendário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarIcon size={20} />
                <span>Calendário</span>
              </CardTitle>
              <CardDescription>Selecione uma data para visualizar</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="rounded-md border"
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
                <Link href="/appointments">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Nova Consulta
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/tests">
                  <FlaskConical className="mr-2 h-4 w-4" />
                  Solicitar Exame
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/prescriptions">
                  <FileText className="mr-2 h-4 w-4" />
                  Nova Receita
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/medications">
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