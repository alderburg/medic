
import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image, AlertTriangle, Loader2, File, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Removido PDF.js - usando object URL para compatibilidade

// Componente para visualizar PDFs usando Object URL (mais compatível)
function PDFViewer({ documentData, documentName }: { documentData: string; documentName: string }) {
  const [objectUrl, setObjectUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentData) return;

    try {
      setLoading(true);
      setError(null);

      // Converter data URL para blob e criar object URL
      const base64Data = documentData.split(',')[1];
      if (!base64Data) {
        throw new Error('Dados do PDF inválidos');
      }

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setObjectUrl(url);
      setLoading(false);
    } catch (err) {
      
      setError(`Erro ao processar o PDF: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setLoading(false);
    }

    // Cleanup function
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [documentData]);

  const downloadPDF = () => {
    try {
      const link = document.createElement('a');
      link.href = documentData;
      link.download = documentName || 'documento.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      
    }
  };



  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-slate-600">Preparando visualização...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="text-center py-8 p-6 bg-yellow-50 rounded-lg border border-yellow-200 mb-4">
          <AlertTriangle className="w-16 h-16 mx-auto text-yellow-600 mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Erro na Visualização</h3>
          <p className="text-yellow-700 mb-4">{error}</p>
          <Button 
            onClick={downloadPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Fazer Download
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Barra de controles */}
      <div className="flex items-center justify-between p-4 bg-slate-100 rounded-t-lg border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-slate-700">Visualização do PDF</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={downloadPDF}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Área de visualização do PDF */}
      <div className="w-full bg-slate-50 rounded-b-lg border border-t-0">
        <object
          data={objectUrl}
          type="application/pdf"
          className="w-full h-96 border-0 rounded-b-lg"
          title={documentName}
        >
          <div className="flex items-center justify-center h-96 p-8">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <p className="text-lg font-medium text-slate-800 mb-2">PDF não pode ser visualizado</p>
              <p className="text-slate-600 mb-4">
                Seu navegador não suporta visualização inline de PDFs
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={downloadPDF}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </object>
      </div>
    </div>
  );
}

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: number;
  documentName: string;
  documentType: string; // 'test' | 'prescription'
}

export default function DocumentViewer({ 
  open, 
  onOpenChange, 
  documentId, 
  documentName, 
  documentType 
}: DocumentViewerProps) {
  const [loading, setLoading] = useState(false);
  const [documentData, setDocumentData] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const { toast } = useToast();

  const downloadDocument = async () => {
    if (!documentData) return;

    try {
      // Criar um link temporário para download
      const link = document.createElement('a');
      link.href = documentData;
      link.download = documentName || 'documento';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download iniciado",
        description: "O arquivo está sendo baixado.",
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  const isImage = fileType?.startsWith('image/');
  const isPDF = fileType === 'application/pdf';

  React.useEffect(() => {
    if (open && documentId) {
      setLoading(true);
      setDocumentData(null);
      setFileType('');

      const endpoint = documentType === 'test' 
        ? `/api/tests/${documentId}/document`
        : `/api/prescriptions/${documentId}/document`;

      

      apiRequest({
        url: endpoint,
        method: "GET",
        on401: "throw"
      })
      .then(response => response.json())
      .then(data => {
        
        if (data.filePath) {
          setDocumentData(data.filePath);
          
          // Detectar tipo de arquivo a partir do data URL
          const dataUrlPrefix = data.filePath.split(',')[0];
          if (dataUrlPrefix.includes('application/pdf')) {
            setFileType('application/pdf');
          } else if (dataUrlPrefix.includes('image/')) {
            setFileType(dataUrlPrefix.split(':')[1].split(';')[0]);
          } else {
            setFileType(data.fileType || 'file');
          }
        } else {
          
          toast({
            title: "Erro",
            description: "Documento não encontrado ou formato inválido.",
            variant: "destructive",
          });
        }
      })
      .catch(error => {
        
        toast({
          title: "Erro",
          description: "Erro ao carregar documento. Tente novamente.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setLoading(false);
      });
    }
  }, [open, documentId, documentType, toast]);

  React.useEffect(() => {
    if (!open) {
      setDocumentData(null);
      setFileType('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-sm mx-auto rounded-xl p-4 max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span className="truncate">{documentName}</span>
          </DialogTitle>
          <DialogDescription>
            Visualização e download do documento anexado ao exame
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-slate-600">Carregando documento...</span>
            </div>
          ) : documentData ? (
            <div className="space-y-4">
              {/* Preview do documento */}
              <div className="border rounded-lg bg-slate-50 overflow-hidden">
                {isImage ? (
                  <div className="text-center p-4">
                    <img 
                      src={documentData} 
                      alt={documentName}
                      className="max-w-full max-h-96 mx-auto rounded shadow-sm"
                    />
                    <div className="flex justify-center mt-4">
                      <Button 
                        onClick={downloadDocument}
                        variant="outline"
                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : isPDF ? (
                  <PDFViewer 
                    documentData={documentData} 
                    documentName={documentName} 
                  />
                ) : (
                  <div className="text-center py-8 p-4">
                    <FileText className="w-16 h-16 mx-auto text-blue-600 mb-4" />
                    <p className="text-lg font-medium text-slate-800 mb-2">Documento</p>
                    <p className="text-slate-600 mb-4">
                      Tipo: {fileType || 'Arquivo'}
                    </p>
                    <div className="flex justify-center">
                      <Button 
                        onClick={downloadDocument}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 mx-auto text-orange-500 mb-4" />
              <p className="text-slate-600">Documento não encontrado</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
