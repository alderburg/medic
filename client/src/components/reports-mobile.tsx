import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BarChart3, TrendingUp, Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Pill, ArrowLeft } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMedicalQueries } from "@/hooks/use-medical-queries";

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

export default function ReportsMobile() {
  const [, navigate] = useLocation();
  const [dateRange, setDateRange] = useState("7d");
  const [selectedMedication, setSelectedMedication] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const queryClient = useQueryClient();
  const { enableMedicalQueries } = useMedicalQueries();

  // Atualizar dados quando filtros mudarem
  useEffect(() => {
    queryClient.refetchQueries({ queryKey: ["/api/medication-logs"] });
  }, [dateRange, selectedMedication, customStartDate, customEndDate, queryClient]);

  const { data: medications = [], isLoading: medicationsLoading } = useQuery({
    queryKey: ["/api/medications"],
    enabled: enableMedicalQueries,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userProfile = {}, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/me"],
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

  const isLoading = medicationsLoading || logsLoading || userLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="mobile-container">
        <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
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
                <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
                <p className="text-sm text-slate-500">Acompanhe sua aderência</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center min-h-96 pb-24">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600 mb-4"></div>
          <p className="text-slate-600 text-lg font-medium">Carregando relatórios...</p>
          <p className="text-slate-400 text-sm mt-2">Atualizando dados mais recentes</p>
        </div>

        <BottomNavigation />
      </div>
    );
  }

  // Mock content for now - você pode implementar toda a lógica mobile aqui
  return (
    <div className="mobile-container">
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
              <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
              <p className="text-sm text-slate-500">Acompanhe sua aderência</p>
            </div>
          </div>
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select value={selectedMedication} onValueChange={setSelectedMedication}>
                <SelectTrigger className="text-left [&>span]:truncate [&>span]:text-left">
                  <SelectValue placeholder="Medicamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="pl-6">Todos os medicamentos</SelectItem>
                  {Array.isArray(medications) && medications.map((med: Medication) => (
                    <SelectItem key={med.id} value={med.id.toString()} className="pl-6">
                      {med.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>
      
      <main className="pb-36 px-4 py-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-slate-600">Relatórios Mobile - Em desenvolvimento</p>
          </CardContent>
        </Card>
      </main>
      
      <BottomNavigation />
    </div>
  );
}