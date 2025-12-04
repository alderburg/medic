import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Target, Activity } from "lucide-react";
import { DesktopLayout } from "@/components/desktop-layout";
import DesktopPageHeader from "@/components/desktop-page-header";
import { useMedicalQueries } from "@/hooks/use-medical-queries";

export default function ReportsDesktopSimple() {
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'trends'>('overview');
  const { enableMedicalQueries } = useMedicalQueries();

  const { data: medications = [], isLoading: medicationsLoading } = useQuery({
    queryKey: ["/api/medications"],
    enabled: enableMedicalQueries,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: medicationLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["/api/medication-logs"],
    enabled: enableMedicalQueries,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });

  const isLoading = medicationsLoading || logsLoading;

  if (isLoading) {
    return (
      <DesktopLayout>
        <DesktopPageHeader
          title="Relatórios"
          subtitle="Acompanhe sua aderência ao tratamento"
        />
        <div className="flex-1 bg-gray-50 overflow-y-auto scrollbar-hide">
          <div className="p-6 space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg p-6">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </DesktopLayout>
    );
  }

  return (
    <DesktopLayout>
      <DesktopPageHeader
        title="Relatórios"
        subtitle="Acompanhe sua aderência ao tratamento"
      />
      <div className="flex-1 bg-gray-50 overflow-y-auto scrollbar-hide">
        <div className="p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="detailed">Detalhado</TabsTrigger>
              <TabsTrigger value="trends">Tendências</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Aderência</CardTitle>
                    <Target className="h-4 w-4 text-emerald-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">85%</div>
                    <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Medicamentos Tomados</CardTitle>
                    <Activity className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{Array.isArray(medicationLogs) ? medicationLogs.filter(log => log.status === 'taken').length : 0}</div>
                    <p className="text-xs text-muted-foreground">Total no período</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Medicamentos Ativos</CardTitle>
                    <BarChart3 className="h-4 w-4 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600">{Array.isArray(medications) ? medications.filter(med => med.isActive !== false).length : 0}</div>
                    <p className="text-xs text-muted-foreground">Em uso atualmente</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Aderência Semanal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Gráfico de aderência será implementado</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Atividades Detalhadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Lista detalhada de atividades será implementada</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tendências por Medicamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Análise de tendências será implementada</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DesktopLayout>
  );
}