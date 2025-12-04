import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { BarChart3, TrendingUp, Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Pill, Download, Target, Activity, Filter, Search, FileText } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from "@/lib/utils";
import { useMedicalQueries } from "@/hooks/use-medical-queries";
import AdherenceChart from "@/components/adherence-chart";

interface MedicationLog {
  id: number;
  medicationId: number;
  scheduledDateTime: string;
  actualDateTime?: string;
  status: 'taken' | 'missed' | 'pending';
  delayMinutes: number;
}

interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
}

export default function ReportsDesktop() {
  const [, navigate] = useLocation();

  const getInitialTab = (): 'overview' | 'detailed' | 'trends' => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'detailed') return 'detailed';
    if (tabParam === 'trends') return 'trends';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'trends'>(getInitialTab());
  const [dateRange, setDateRange] = useState("7d");
  const [selectedMedication, setSelectedMedication] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const queryClient = useQueryClient();
  const { enableMedicalQueries } = useMedicalQueries();

  // Atualizar dados quando filtros mudarem
  useEffect(() => {
    queryClient.refetchQueries({ queryKey: [getMedicationLogsUrl()] });
  }, [dateRange, selectedMedication, customStartDate, customEndDate, queryClient]);

  const { data: medications = [], isLoading: medicationsLoading } = useQuery({
    queryKey: ["/api/medications"],
    enabled: enableMedicalQueries,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: userProfile = {}, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Construir URL com parâmetros de data para filtro personalizado
  const getMedicationLogsUrl = () => {
    // Para todos os casos, buscar todos os dados e filtrar no frontend
    // Isso garante consistência e evita problemas de timezone no backend
    return "/api/medication-logs";
  };

  const { data: medicationLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: [getMedicationLogsUrl()],
    enabled: enableMedicalQueries,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 segundos
  });

  const isLoading = medicationsLoading || logsLoading || userLoading;

  // Processar dados dos logs
  const processedLogs = Array.isArray(medicationLogs) ? medicationLogs.map((log: any) => {
    const medication = Array.isArray(medications) ? medications.find((m: any) => m.id === log.medicationId) : null;
    return {
      ...log,
      medicationName: medication?.name || 'Medicamento',
      medicationDosage: medication?.dosage || '',
    };
  }) : [];

  // Função para filtrar logs baseado no período selecionado (mesma lógica mobile)
  const filterLogs = (logs: any[]) => {
    if (!logs || logs.length === 0) return [];

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          // Para filtro personalizado, usar horário local sem ajustes de timezone
          startDate = new Date(customStartDate + 'T00:00:00');
          endDate = new Date(customEndDate + 'T23:59:59');
        } else {
          startDate = subDays(now, 7);
        }
        break;
      default:
        startDate = subDays(now, 7);
    }

    return logs.filter((log: any) => {
      // Para filtro personalizado, comparar apenas as datas sem considerar horário
      if (dateRange === "custom" && customStartDate && customEndDate) {
        const logDate = new Date(log.scheduledDateTime);
        const logDateStr = logDate.toISOString().split('T')[0]; // YYYY-MM-DD

        const matchesDate = logDateStr >= customStartDate && logDateStr <= customEndDate;
        const matchesMedication = selectedMedication === "all" || 
          log.medicationId?.toString() === selectedMedication;

        return matchesDate && matchesMedication;
      }

      // Para outros filtros, usar comparação de datetime normal
      const logDate = new Date(log.scheduledDateTime);

      // Comparar apenas a parte da data para evitar problemas com timezone
      const logDateStr = logDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const endDateStr = endDate.toISOString().split('T')[0]; // YYYY-MM-DD

      const matchesDate = logDateStr >= startDateStr && logDateStr <= endDateStr;
      const matchesMedication = selectedMedication === "all" || 
        log.medicationId?.toString() === selectedMedication;

      return matchesDate && matchesMedication;
    });
  };

  // Calcular estatísticas (mesma lógica mobile)
  const calculateStatistics = (logs: any[]) => {
    if (!logs || logs.length === 0) {
      return { total: 0, taken: 0, missed: 0, adherenceRate: 0, averageDelay: 0, early: 0, onTime: 0, delayed: 0 };
    }

    const total = logs.length;
    const taken = logs.filter(log => log.status === 'taken').length;

    // Para medicamentos perdidos: incluir apenas se não for do dia atual
    const nowUTC = new Date();
    const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
    const missed = logs.filter((log: any) => {
      // Verificar se é do dia atual usando horário brasileiro
      const logDate = new Date(log.scheduledDateTime);
      // Extrair apenas a data da string ISO para evitar problemas de timezone
      const logDateStr = log.scheduledDateTime.split('T')[0]; // YYYY-MM-DD
      const todayStr = new Date(nowBrasil.getTime()).toISOString().split('T')[0]; // YYYY-MM-DD
      const isToday = logDateStr === todayStr;

      // Se for do dia atual, não contar como perdido
      if (isToday) {
        return false;
      }

      // Para outros dias, usar lógica normal
      if (log.status === 'missed' || log.status === 'overdue') {
        return true;
      }

      // Para medicamentos pendentes, verificar se a data/horário já passou
      if (log.status === 'pending') {
        const scheduledDateTime = new Date(log.scheduledDateTime);
        const timeDiffMs = nowBrasil.getTime() - scheduledDateTime.getTime();
        const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));
        return timeDiffMinutes > 15;
      }

      return false;
    }).length;

    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

    // Calcular categorias de pontualidade
    const takenLogs = logs.filter(log => log.status === 'taken');
    let early = 0;
    let onTime = 0;
    let delayed = 0;
    let totalDelay = 0;
    let delayedCount = 0;

    takenLogs.forEach(log => {
      const delayMinutes = log.delayMinutes || 0;

      if (delayMinutes < 0) {
        early++;
      } else if (delayMinutes === 0) {
        onTime++;
      } else {
        delayed++;
        totalDelay += delayMinutes;
        delayedCount++;
      }
    });

    // Calcular atraso médio apenas dos medicamentos atrasados
    const averageDelay = delayedCount > 0 ? totalDelay / delayedCount : 0;

    return { total, taken, missed, adherenceRate, averageDelay, early, onTime, delayed };
  };

  // Gerar dados para gráfico de aderência semanal (mesma lógica mobile)
  const generateWeeklyAdherenceData = (logs: any[]) => {
    if (!logs || logs.length === 0) {
      return {
        weeklyData: [0, 0, 0, 0, 0, 0, 0],
        overallPercentage: 0,
        trend: 0,
      };
    }

    // Se é filtro personalizado, mostrar dados específicos do período
    if (dateRange === "custom" && customStartDate && customEndDate) {
      // Para filtro personalizado, mostrar dados agrupados por data específica
      const logsByDate: { [key: string]: any[] } = {};

      logs.forEach((log: any) => {
        // Usar a data local diretamente da string, sem criar objeto Date
        const scheduledDateTime = log.scheduledDateTime;
        const dayKey = scheduledDateTime.split('T')[0]; // Extrair apenas YYYY-MM-DD

        if (!logsByDate[dayKey]) {
          logsByDate[dayKey] = [];
        }
        logsByDate[dayKey].push(log);
      });

      // Se é o mesmo dia (data inicial = data final), mostrar dados deste dia
      if (customStartDate === customEndDate) {
        const dayKey = customStartDate;
        const dayLogs = logsByDate[dayKey] || [];
        const taken = dayLogs.filter((log: any) => log.status === 'taken').length;
        const total = dayLogs.length;
        const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;

        return {
          weeklyData: [adherence, adherence, adherence, adherence, adherence, adherence, adherence],
          overallPercentage: adherence,
          trend: 0,
        };
      }

      // Para múltiplos dias, usar média dos dados do período
      const startDate = new Date(customStartDate + 'T12:00:00');
      const endDate = new Date(customEndDate + 'T12:00:00');

      let totalTaken = 0;
      let totalScheduled = 0;

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayKey = currentDate.toISOString().split('T')[0];
        const dayLogs = logsByDate[dayKey] || [];
        const taken = dayLogs.filter((log: any) => log.status === 'taken').length;

        totalTaken += taken;
        totalScheduled += dayLogs.length;

        currentDate.setDate(currentDate.getDate() + 1);
      }

      const avgAdherence = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;

      return {
        weeklyData: [avgAdherence, avgAdherence, avgAdherence, avgAdherence, avgAdherence, avgAdherence, avgAdherence],
        overallPercentage: avgAdherence,
        trend: 0,
      };
    }

    // Para outros filtros, usar lógica padrão por dia da semana
    const weeklyData = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dayOrder = [0, 1, 2, 3, 4, 5, 6]; // Domingo a Sábado

    for (const targetWeekday of dayOrder) {
      let targetDate = new Date(today);
      let daysBack = (today.getDay() - targetWeekday + 7) % 7;
      if (daysBack === 0 && today.getDay() !== targetWeekday) {
        daysBack = 7;
      }

      targetDate.setDate(targetDate.getDate() - daysBack);
      targetDate.setHours(0, 0, 0, 0);

      const dayLogs = logs.filter((log: any) => {
        const logDate = new Date(log.scheduledDateTime);
        const logDateStr = logDate.toISOString().split('T')[0];
        const targetDateStr = targetDate.toISOString().split('T')[0];
        return logDateStr === targetDateStr;
      });

      if (dayLogs.length === 0) {
        weeklyData.push(0);
      } else {
        const takenCount = dayLogs.filter((log: any) => log.status === 'taken').length;
        const adherencePercentage = Math.round((takenCount / dayLogs.length) * 100);
        weeklyData.push(adherencePercentage);
      }
    }

    const totalLogs = logs.length;
    const takenLogs = logs.filter((log: any) => log.status === 'taken').length;
    const overallPercentage = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 0;

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

  // Gerar atividades recentes com lógica idêntica à versão mobile (sem limite)
  const generateRecentActivities = (logs: any[]) => {
    return logs
      .sort((a: any, b: any) => {
        // Extrair data e horário diretamente da string ISO (mesma lógica mobile)
        const dateTimeA = a.scheduledDateTime;
        const dateTimeB = b.scheduledDateTime;

        // Comparar primeiro por data (mais recente primeiro)
        const dateA = dateTimeA.split('T')[0];
        const dateB = dateTimeB.split('T')[0];

        if (dateA !== dateB) {
          return dateB.localeCompare(dateA); // Ordem decrescente de data
        }

        // Se for o mesmo dia, ordenar por horário (00:00 primeiro)
        const timeA = dateTimeA.split('T')[1];
        const timeB = dateTimeB.split('T')[1];

        return timeA.localeCompare(timeB); // Ordem crescente de horário
      })
      .map(log => {
        // Calcular se o medicamento deveria ser considerado "perdido" baseado na data/horário
        const isOverdueForDate = (() => {
          if (log.status === 'taken' || log.status === 'missed') {
            return false; // Já foi tomado ou marcado como perdido
          }

          // Para medicamentos pendentes, verificar se a data/horário já passou
          const scheduledDateTime = new Date(log.scheduledDateTime);

          // Usar horário brasileiro (UTC-3) para comparação
          const nowUTC = new Date();
          const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));

          // Se o medicamento foi programado para mais de 15 minutos atrás no horário brasileiro
          const timeDiffMs = nowBrasil.getTime() - scheduledDateTime.getTime();
          const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

          return timeDiffMinutes > 15;
        })();

        // Verificar se o medicamento é de outro dia (não hoje)
        const isFromPreviousDay = (() => {
          const nowUTC = new Date();
          const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));

          // Extrair apenas a data da string ISO para evitar problemas de timezone
          const logDateStr = log.scheduledDateTime.split('T')[0]; // YYYY-MM-DD
          const todayStr = nowBrasil.toISOString().split('T')[0]; // YYYY-MM-DD

          return logDateStr < todayStr; // Apenas dias anteriores, não hoje
        })();

        // Determinar status de exibição usando mesma lógica mobile
        let displayStatus = 'Pendente';
        let statusIcon = 'pending';

        if (log.status === 'taken') {
          displayStatus = 'Tomado';
          statusIcon = 'taken';
        } else if (log.status === 'missed' || log.status === 'overdue' || (isOverdueForDate && isFromPreviousDay)) {
          displayStatus = 'Perdido';
          statusIcon = 'missed';
        } else if (isOverdueForDate && !isFromPreviousDay) {
          displayStatus = 'Não tomado';
          statusIcon = 'missed';
        } else {
          displayStatus = 'Pendente';
          statusIcon = 'pending';
        }

        return {
          ...log,
          medicationName: log.medicationName || 'Medicamento',
          medicationDosage: log.medicationDosage || '',
          displayStatus,
          statusIcon
        };
      });
  };

  // Gerar PDF
  const generatePDF = async () => {
    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Título
      pdf.setFontSize(20);
      pdf.text('RELATÓRIO DE ADERÊNCIA AO TRATAMENTO', 20, 20);

      // Dados do paciente
      pdf.setFontSize(12);
      const userName = (userProfile as any)?.name || 'Paciente';
      const userAge = (userProfile as any)?.age || 'N/A';
      const userWeight = (userProfile as any)?.weight || 'N/A';

      pdf.text(`Paciente: ${userName}`, 20, 35);
      pdf.text(`Idade: ${userAge} anos`, 20, 42);
      pdf.text(`Peso: ${userWeight} kg`, 20, 49);

      // Período do relatório
      const periodText = dateRange === 'custom' && customStartDate && customEndDate
        ? `${format(new Date(customStartDate), 'dd/MM/yyyy')} a ${format(new Date(customEndDate), 'dd/MM/yyyy')}`
        : dateRange === '7d' ? 'Últimos 7 dias'
        : dateRange === '30d' ? 'Últimos 30 dias'
        : 'Últimos 90 dias';

      pdf.text(`Período: ${periodText}`, 20, 56);

      // Estatísticas
      pdf.setFontSize(14);
      pdf.text('ESTATÍSTICAS GERAIS', 20, 70);

      pdf.setFontSize(12);
      pdf.text(`Total de medicações: ${stats.total}`, 20, 80);
      pdf.text(`Medicações tomadas: ${stats.taken}`, 20, 87);
      pdf.text(`Medicações perdidas: ${stats.missed}`, 20, 94);
      pdf.text(`Taxa de aderência: ${stats.adherenceRate}%`, 20, 101);

      if (stats.averageDelay > 0) {
        const delayHours = Math.floor(stats.averageDelay / 60);
        const delayMinutes = Math.round(stats.averageDelay % 60);
        pdf.text(`Atraso médio: ${delayHours}h ${delayMinutes}min`, 20, 108);
      }

      // Atividades recentes
      pdf.setFontSize(14);
      pdf.text('ATIVIDADES RECENTES', 20, 125);

      pdf.setFontSize(10);
      let yPos = 135;

      recentActivities.slice(0, 15).forEach((activity, index) => {
        const scheduledTime = format(new Date(activity.scheduledDateTime), "dd/MM/yyyy HH:mm");
        const statusText = activity.displayStatus;

        pdf.text(`${index + 1}. ${activity.medicationName} - ${activity.medicationDosage}`, 20, yPos);
        pdf.text(`   Programado: ${scheduledTime} | Status: ${statusText}`, 20, yPos + 5);

        if (activity.actualDateTime) {
          const actualTime = format(new Date(activity.actualDateTime), "HH:mm");
          pdf.text(`   Tomado às: ${actualTime}`, 20, yPos + 10);
          yPos += 15;
        } else {
          yPos += 10;
        }

        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
      });

      // Salvar PDF
      pdf.save(`relatorio-aderencia-${format(new Date(), 'dd-MM-yyyy')}.pdf`);

    } catch (error) {

    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Função para renderizar overview
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Estatísticas principais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Resumo Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <p className="text-xs text-muted-foreground">medicações</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tomadas</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.taken}</div>
                <p className="text-xs text-muted-foreground">medicações</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Perdidas</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.missed}</div>
                <p className="text-xs text-muted-foreground">medicações</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aderência</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.adherenceRate}%</div>
                <p className="text-xs text-muted-foreground">taxa de aderência</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de aderência semanal */}
      <AdherenceChart 
        weeklyData={adherenceData.weeklyData}
        overallPercentage={adherenceData.overallPercentage}
        trend={adherenceData.trend}
      />

      {/* Cards de pontualidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Estatísticas de Horário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Antes</CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.early}</div>
                <p className="text-xs text-muted-foreground">medicações</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">No Horário</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.onTime}</div>
                <p className="text-xs text-muted-foreground">medicações</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.delayed}</div>
                <p className="text-xs text-muted-foreground">medicações</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atraso Médio</CardTitle>
                <Clock className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats.averageDelay > 0 ? `${Math.floor(stats.averageDelay / 60)}h ${Math.round(stats.averageDelay % 60)}min` : '0min'}
                </div>
                <p className="text-xs text-muted-foreground">tempo médio</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Função para renderizar atividades detalhadas (usa lógica idêntica ao mobile)
  const renderDetailed = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Nenhuma atividade recente</p>
              </div>
            ) : (
              filteredLogs
                .sort((a: any, b: any) => {
                  // Extrair data e horário diretamente da string ISO (mesma lógica mobile)
                  const dateTimeA = a.scheduledDateTime;
                  const dateTimeB = b.scheduledDateTime;

                  // Comparar primeiro por data (mais recente primeiro)
                  const dateA = dateTimeA.split('T')[0];
                  const dateB = dateTimeB.split('T')[0];

                  if (dateA !== dateB) {
                    return dateB.localeCompare(dateA); // Ordem decrescente de data
                  }

                  // Se for o mesmo dia, ordenar por horário (00:00 primeiro)
                  const timeA = dateTimeA.split('T')[1];
                  const timeB = dateTimeB.split('T')[1];

                  return timeA.localeCompare(timeB); // Ordem crescente de horário
                })
                // Para filtro personalizado com mesmo dia, mostrar TODAS as atividades do dia
                .filter((log: any) => {
                  // Se é filtro personalizado e mesmo dia, mostrar TODAS as atividades do dia
                  if (dateRange === "custom" && customStartDate && customEndDate && customStartDate === customEndDate) {
                    return true; // Mostrar todas
                  }
                  return true; // Mostrar todas para qualquer filtro
                })
                .map((log: any) => {
              const medication = Array.isArray(medications) ? 
                medications.find((m: any) => m.id === log.medicationId) : null;

              // Calcular se o medicamento deveria ser considerado "perdido" baseado na data/horário
              const isOverdueForDate = (() => {
                if (log.status === 'taken' || log.status === 'missed') {
                  return false; // Já foi tomado ou marcado como perdido
                }

                // Para medicamentos pendentes, verificar se a data/horário já passou
                const scheduledDateTime = new Date(log.scheduledDateTime);

                // Usar horário brasileiro (UTC-3) para comparação
                const nowUTC = new Date();
                const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));

                // Se o medicamento foi programado para mais de 15 minutos atrás no horário brasileiro
                const timeDiffMs = nowBrasil.getTime() - scheduledDateTime.getTime();
                const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

                return timeDiffMinutes > 15;
              })();

              // Verificar se o medicamento é de outro dia (não hoje)
              const isFromPreviousDay = (() => {
                const nowUTC = new Date();
                const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));

                // Extrair apenas a data da string ISO para evitar problemas de timezone
                const logDateStr = log.scheduledDateTime.split('T')[0]; // YYYY-MM-DD
                const todayStr = nowBrasil.toISOString().split('T')[0]; // YYYY-MM-DD

                return logDateStr < todayStr; // Apenas dias anteriores, não hoje
              })();

              return (
                <div key={log.id} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-b-0">
                  <div className="flex items-center gap-3 flex-1">
                    {log.status === 'taken' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : log.status === 'missed' || log.status === 'overdue' || (isOverdueForDate && isFromPreviousDay) ? (
                      <XCircle className="w-5 h-5 text-red-700 flex-shrink-0" />
                    ) : isOverdueForDate && !isFromPreviousDay ? (
                      <XCircle className="w-5 h-5 text-red-700 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">
                        {medication?.name || 'Medicamento'}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        {medication?.dosage || ''}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Programado: {(() => {
                          // Extrair horário diretamente da string para evitar conversões UTC (mesma lógica mobile)
                          const dateTimeStr = log.scheduledDateTime; // ex: "2025-07-05T13:00:00.000Z"
                          const [datePart, timePart] = dateTimeStr.split('T');
                          const [year, month, day] = datePart.split('-');
                          const [time] = timePart.split('.');
                          const [hours, minutes] = time.split(':');

                          return `${day}/${month}/${year} às ${hours}:${minutes}`;
                        })()}
                      </div>
                      {log.actualDateTime && (
                        <div className="text-xs text-slate-500 mt-1">
                          Tomado: {(() => {
                            // Usar timezone UTC para mostrar o horário exato salvo no banco (mesma lógica mobile)
                            const actualDate = new Date(log.actualDateTime);
                            const day = actualDate.getUTCDate().toString().padStart(2, '0');
                            const month = (actualDate.getUTCMonth() + 1).toString().padStart(2, '0');
                            const year = actualDate.getUTCFullYear();
                            const hours = actualDate.getUTCHours().toString().padStart(2, '0');
                            const minutes = actualDate.getUTCMinutes().toString().padStart(2, '0');

                            return `${day}/${month}/${year} às ${hours}:${minutes}`;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center ml-4">
                    <Badge className={
                      log.status === 'taken'
                        ? 'bg-green-50 text-green-600 border-green-200'
                        : log.status === 'missed' || log.status === 'overdue' || isOverdueForDate
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-blue-50 text-blue-600 border-blue-200'
                    }>
                      {log.status === 'taken' ? 'Tomado' :
                       log.status === 'missed' ? 'Perdido' : 
                       log.status === 'overdue' && isFromPreviousDay ? 'Perdido' :
                       log.status === 'overdue' && !isFromPreviousDay ? 'Não tomado' :
                       isOverdueForDate && isFromPreviousDay ? 'Perdido' :
                       isOverdueForDate && !isFromPreviousDay ? 'Não tomado' :
                       'Pendente'}
                    </Badge>
                  </div>
                </div>
              );
            }))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Função para renderizar tendências
  const renderTrends = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tendências por Medicamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(medications) ? medications.map((medication: any) => {
              const medicationLogs = filteredLogs.filter(log => log.medicationId === medication.id);
              const medicationStats = calculateStatistics(medicationLogs);

              return (
                <div key={medication.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{medication.name}</h4>
                      <p className="text-sm text-gray-600">{medication.dosage}</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {medicationStats.adherenceRate}% aderência
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total:</span>
                      <span className="ml-2 font-medium">{medicationStats.total}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tomadas:</span>
                      <span className="ml-2 font-medium text-green-600">{medicationStats.taken}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Perdidas:</span>
                      <span className="ml-2 font-medium text-red-600">{medicationStats.missed}</span>
                    </div>
                  </div>
                </div>
              );
            }) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Always call hooks in the same order
  const filteredLogs = filterLogs(processedLogs);
  const stats = calculateStatistics(filteredLogs);
  const adherenceData = generateWeeklyAdherenceData(filteredLogs);
  const recentActivities = generateRecentActivities(filteredLogs);

  // Update URL when tab changes
  useEffect(() => {
    const url = `/reports?tab=${activeTab}`;
    navigate(url, { replace: true });
  }, [activeTab, navigate]);

  if (isLoading || !Array.isArray(medications) || !Array.isArray(medicationLogs)) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="flex-1 overflow-hidden">
          <Tabs value="overview" className="h-full flex flex-col">
            <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <TabsList className="h-12">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Visão Geral
                  </TabsTrigger>
                  <TabsTrigger value="detailed" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Detalhado
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-4">
                  <div className="w-56 h-10 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-44 h-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-hidden">
              <TabsContent value="overview" className="mt-0 h-full overflow-y-auto scrollbar-hide">
                <div className="space-y-6">
                  {/* Skeleton para Estatísticas Gerais */}
                  <Card>
                    <CardHeader>
                      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                          <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                            </CardHeader>
                            <CardContent>
                              <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mb-2"></div>
                              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Skeleton para Gráfico de Aderência */}
                  <Card>
                    <CardHeader>
                      <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
                    </CardContent>
                  </Card>

                  {/* Skeleton para Estatísticas de Horário */}
                  <Card>
                    <CardHeader>
                      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                          <Card key={`timing-${i}`}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                            </CardHeader>
                            <CardContent>
                              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="h-full flex flex-col">
          <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <TabsList className="h-12">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="detailed" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Detalhado
                </TabsTrigger>

              </TabsList>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Select value={selectedMedication} onValueChange={setSelectedMedication}>
                    <SelectTrigger className="w-56">
                      <Pill className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os medicamentos</SelectItem>
                      {medications.map((medication: any) => (
                        <SelectItem key={medication.id} value={medication.id.toString()}>
                          {medication.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-44">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Últimos 7 dias</SelectItem>
                      <SelectItem value="30d">Últimos 30 dias</SelectItem>
                      <SelectItem value="90d">Últimos 90 dias</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>
          </div>

          {/* Campos de data personalizada */}
          {dateRange === "custom" && (
            <div className="border-b border-gray-200 px-6 py-4 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customStartDate" className="text-sm font-medium text-slate-700">
                    Data Inicial
                  </Label>
                  <Input
                    id="customStartDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      setCustomStartDate(newStartDate);
                      if (customEndDate && newStartDate > customEndDate) {
                        setCustomEndDate("");
                      }
                    }}
                    className="mt-1"
                    max={customEndDate || undefined}
                  />
                </div>
                <div>
                  <Label htmlFor="customEndDate" className="text-sm font-medium text-slate-700">
                    Data Final
                  </Label>
                  <Input
                    id="customEndDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => {
                      const newEndDate = e.target.value;
                      if (customStartDate && newEndDate < customStartDate) {
                        return;
                      }
                      setCustomEndDate(newEndDate);
                    }}
                    className="mt-1"
                    min={customStartDate || undefined}
                  />
                  {customStartDate && customEndDate && customEndDate < customStartDate && (
                    <p className="text-xs text-red-600 mt-1">
                      Data final não pode ser anterior à data inicial
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 p-6 overflow-hidden">
            <TabsContent value="overview" className="mt-0 h-full overflow-y-auto scrollbar-hide">
              {renderOverview()}
            </TabsContent>

            <TabsContent value="detailed" className="mt-0 h-full overflow-y-auto scrollbar-hide">
              {renderDetailed()}
            </TabsContent>


          </div>
        </Tabs>
      </div>
    </div>
  );
}