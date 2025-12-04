import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileText, User, Calendar, Clock, Edit, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MedicalEvolution {
  id: number;
  patientId: number;
  doctorId: number;
  doctorName: string;
  doctorCrm?: string;
  appointmentId?: number;
  chiefComplaint: string;
  currentIllnessHistory?: string;
  physicalExam?: string;
  vitalSigns?: string;
  diagnosticHypotheses?: string;
  therapeuticPlan?: string;
  prescribedMedications?: string;
  requestedExams?: string;
  generalRecommendations?: string;
  additionalObservations?: string;
  isConfirmed: boolean;
  digitalSignature?: string;
  createdAt: string;
  updatedAt: string;
}

interface MedicalEvolutionsListProps {
  evolutions: MedicalEvolution[];
  isLoading: boolean;
  userProfileType: string;
  onAddEvolution: () => void;
  onViewEvolution: (evolution: MedicalEvolution) => void;
  onEditEvolution: (evolution: MedicalEvolution) => void;
  onDeleteEvolution: (id: number, doctorName: string) => void;
}

export default function MedicalEvolutionsList({
  evolutions,
  isLoading,
  userProfileType,
  onAddEvolution,
  onViewEvolution,
  onEditEvolution,
  onDeleteEvolution
}: MedicalEvolutionsListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEvolutions = evolutions.filter(evolution =>
    evolution.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    evolution.chiefComplaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (evolution.diagnosticHypotheses && evolution.diagnosticHypotheses.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isDoctor = userProfileType === 'doctor';
  const tabLabel = isDoctor ? 'Evolução' : 'Registro Médico';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">{tabLabel}</h2>
        </div>
        {isDoctor && (
          <Button onClick={onAddEvolution} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Evolução
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder={`Buscar em ${tabLabel.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredEvolutions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium mb-2">
              {evolutions.length === 0 
                ? `Nenhum ${tabLabel.toLowerCase()} encontrado`
                : 'Nenhum resultado encontrado'
              }
            </p>
            <p className="text-center">
              {evolutions.length === 0
                ? isDoctor 
                  ? 'Crie sua primeira evolução médica clicando no botão "Nova Evolução"'
                  : 'Não há registros médicos disponíveis'
                : 'Tente ajustar os filtros de busca'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvolutions.map((evolution) => (
            <Card key={evolution.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <CardTitle className="text-sm font-medium">
                        Dr(a). {evolution.doctorName}
                      </CardTitle>
                      {evolution.doctorCrm && (
                        <Badge variant="secondary" className="text-xs">
                          {evolution.doctorCrm}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {(() => {
                          const date = new Date(evolution.createdAt);
                          const correctedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
                          return format(correctedDate, "dd/MM/yyyy", { locale: ptBR });
                        })()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {(() => {
                          const date = new Date(evolution.createdAt);
                          const correctedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
                          return format(correctedDate, "HH:mm", { locale: ptBR });
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewEvolution(evolution)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isDoctor && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditEvolution(evolution)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteEvolution(evolution.id, evolution.doctorName)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Queixa Principal:</p>
                    <p className="text-sm line-clamp-2">{evolution.chiefComplaint}</p>
                  </div>

                  {evolution.diagnosticHypotheses && (
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Diagnóstico:</p>
                      <p className="text-sm line-clamp-2">{evolution.diagnosticHypotheses}</p>
                    </div>
                  )}

                  {evolution.prescribedMedications && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <span className="inline-block w-2 h-2 bg-green-600 rounded-full"></span>
                      Medicamentos prescritos
                    </div>
                  )}

                  {evolution.requestedExams && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <span className="inline-block w-2 h-2 bg-orange-600 rounded-full"></span>
                      Exames solicitados
                    </div>
                  )}

                  {evolution.vitalSigns && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                      Sinais vitais registrados
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}