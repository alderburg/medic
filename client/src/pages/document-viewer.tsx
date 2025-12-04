import React, { useState, useEffect } from 'react';
import { useRoute } from "wouter";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Download, FileText, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import BottomNavigation from "@/components/bottom-navigation";

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
      if (objectUrl) {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = documentName || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-3 text-slate-600">Carregando PDF...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <iframe
        src={objectUrl}
        className="w-full h-[70vh] border-0"
        title={documentName}
      />
    </div>
  );
}

export default function DocumentViewerPage() {
  const isMobile = useIsMobile();
  const [, params] = useRoute("/document-viewer/:documentType/:documentId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [documentData, setDocumentData] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const documentType = params?.documentType || 'test';
  const documentId = params?.documentId;

  const isImage = documentData.startsWith('data:image/');
  const isPDF = documentData.startsWith('data:application/pdf');
  
  // File type detection
  const fileType = documentData.split(';')[0]?.split(':')[1] || '';

  // Função para extrair nome do arquivo
  const getFileNameFromData = (filePath: string, documentName?: string) => {
    if (!filePath) return null;
    
    let fileName = '';
    
    // Verificar se é o novo formato JSON com nome original
    try {
      const fileData = JSON.parse(filePath);
      if (fileData.originalName) {
        fileName = fileData.originalName;
      } else if (fileData.data) {
        // Para formato JSON sem nome original, usar o nome do documento
        const baseName = documentName ? documentName.replace(/[^a-zA-Z0-9-_\s]/g, '_') : 'documento';
        
        // Detectar extensão pelo tipo MIME se possível
        let extension = 'file';
        if (fileData.data.startsWith('data:')) {
          const mimeMatch = fileData.data.match(/data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'unknown';
          
          if (mimeType.includes('pdf')) {
            extension = 'pdf';
          } else if (mimeType.includes('image/png')) {
            extension = 'png';
          } else if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) {
            extension = 'jpg';
          } else if (mimeType.includes('image')) {
            extension = 'png';
          }
        } else if (fileData.data.startsWith('iVBOR')) {
          extension = 'png';
        } else if (fileData.data.startsWith('/9j/')) {
          extension = 'jpg';
        } else if (fileData.data.startsWith('JVBERi')) {
          extension = 'pdf';
        }
        
        fileName = `${baseName}.${extension}`;
      }
    } catch (e) {
      // Não é JSON - verificar se é data URL ou base64 puro
      if (filePath.startsWith('data:')) {
        const mimeMatch = filePath.match(/data:([^;]+);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'unknown';
        
        let extension = 'file';
        if (mimeType.includes('pdf')) {
          extension = 'pdf';
        } else if (mimeType.includes('image/png')) {
          extension = 'png';
        } else if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) {
          extension = 'jpg';
        } else if (mimeType.includes('image')) {
          extension = 'png';
        }
        
        const baseName = documentName ? documentName.replace(/[^a-zA-Z0-9-_\s]/g, '_') : 'documento';
        fileName = `${baseName}.${extension}`;
      } else if (filePath.length > 100) {
        // Provavelmente é base64 puro - usar nome do documento
        const baseName = documentName ? documentName.replace(/[^a-zA-Z0-9-_\s]/g, '_') : 'documento';
        
        // Tentar detectar tipo pelo início do base64
        let extension = 'file';
        if (filePath.startsWith('iVBOR')) {
          extension = 'png';
        } else if (filePath.startsWith('/9j/')) {
          extension = 'jpg';
        } else if (filePath.startsWith('JVBERi')) {
          extension = 'pdf';
        }
        
        fileName = `${baseName}.${extension}`;
      } else {
        // Arquivo normal
        fileName = filePath.split('/').pop() || 'arquivo';
      }
    }
    
    return fileName || null;
  };

  const goBack = () => {
    if (documentType === 'prescription') {
      setLocation('/prescriptions?tab=prescriptions');
    } else {
      setLocation('/tests?tab=tests');
    }
  };

  const downloadDocument = () => {
    try {
      const link = document.createElement('a');
      link.href = documentData;

      // Nome inteligente baseado no tipo MIME
      let extension = '';
      if (isPDF) extension = '.pdf';
      else if (isImage) {
        if (documentData.includes('image/jpeg')) extension = '.jpg';
        else if (documentData.includes('image/png')) extension = '.png';
        else extension = '.img';
      } else {
        extension = '.doc';
      }

      link.download = (documentName || 'documento') + extension;
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

  useEffect(() => {
    if (!documentId) return;

    const fetchDocument = async () => {
        try {
          setLoading(true);

          const endpoint = documentType === 'prescription' 
            ? `/api/prescriptions/${documentId}/document`
            : `/api/tests/${documentId}/document`;

          const response = await apiRequest({
            url: endpoint,
            method: "GET",
            on401: "throw"
          });

          const data = await response.json();
          

          if (data?.filePath) {
            
            
            
            // Processar o arquivo igual aos exames
            let documentContent = data.filePath;
            let originalFilePath = data.filePath; // Manter referência ao filePath original para nome
            
            // Verificar se é JSON com campo data
            try {
              const jsonData = JSON.parse(data.filePath);
              if (jsonData.data) {
                
                documentContent = jsonData.data;
                // Para JSON, usar o campo data para conteúdo, mas manter filePath original para nome
              }
            } catch (e) {
              // Não é JSON, processar como base64 ou data URL
            }
            
            // Se não começar com data:, verificar se é um base64 raw e adicionar o prefixo correto
            if (!documentContent.startsWith('data:')) {
              // Se começar com iVBOR (PNG) ou similar, é uma imagem base64 raw
              if (documentContent.startsWith('iVBOR') || documentContent.startsWith('/9j/') || documentContent.startsWith('UklGR')) {
                documentContent = `data:image/png;base64,${documentContent}`;
                
              } else if (documentContent.startsWith('JVBERi')) {
                documentContent = `data:application/pdf;base64,${documentContent}`;
                
              }
            }
            
            setDocumentData(documentContent);
            
            // Buscar informações do documento correto
            try {
              if (documentType === 'prescription') {
                // Buscar dados da prescrição
                const prescriptionResponse = await apiRequest({
                  url: `/api/prescriptions/${documentId}`,
                  method: "GET",
                  on401: "throw"
                });
                const prescriptionInfo = await prescriptionResponse.json();
                setDocumentName(prescriptionInfo?.title || 'Receita');
                const extractedFileName = getFileNameFromData(originalFilePath, prescriptionInfo?.title);
                setFileName(extractedFileName || `${prescriptionInfo?.title || 'receita'}.pdf`);
              } else {
                // Buscar dados do teste
                const testResponse = await apiRequest({
                  url: `/api/tests/${documentId}`,
                  method: "GET",
                  on401: "throw"
                });
                const testInfo = await testResponse.json();
                setDocumentName(testInfo?.name || 'Exame');
                const extractedFileName = getFileNameFromData(originalFilePath, testInfo?.name);
                setFileName(extractedFileName || `${testInfo?.name || 'exame'}.pdf`);
              }
            } catch {
              setDocumentName(documentType === 'prescription' ? 'Receita' : 'Exame');
              // Para dados sem informações adicionais, usar nome baseado no tipo
              const defaultName = documentType === 'prescription' ? 'receita' : 'exame';
              const extension = documentContent.includes('image/') ? 'png' : 'pdf';
              setFileName(`${defaultName}.${extension}`);
            }
          } else {
            throw new Error('Documento não encontrado');
          }
        } catch (error) {
          
          toast({
            title: "Erro ao carregar documento",
            description: "Não foi possível carregar o documento.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

    fetchDocument();
  }, [documentId, documentType, toast]);

  // Para mobile, usar layout original com header próprio e bottom navigation
  if (isMobile) {
    return (
      <div className="mobile-container h-screen overflow-hidden flex flex-col">
        {/* Header com padrão do sistema */}
        <header className="bg-white shadow-sm border-b border-slate-200 px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="mr-3"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-slate-800">
                {fileName || documentName || 'Visualizar Documento'}
              </h1>
              <p className="text-sm text-slate-500">
                {documentType === 'test' ? 'Documento do exame' : 'Documento da receita'}
              </p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-full">
              <FileText className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </header>

        {/* Conteúdo principal com fundo branco */}
        <main className="bg-white flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full bg-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : documentData ? (
            <>
              {isImage ? (
                <div className="bg-white h-[calc(100vh-160px)] overflow-auto p-0 m-0 flex justify-center items-center">
                  <img 
                    src={documentData} 
                    alt={documentName}
                    className="max-w-full max-h-full object-contain cursor-pointer"
                    onClick={downloadDocument}
                    title="Clique para baixar a imagem"
                  />
                </div>
              ) : isPDF ? (
                <iframe
                  src={(() => {
                    try {
                      const base64Data = documentData.split(',')[1];
                      const byteCharacters = atob(base64Data);
                      const byteNumbers = new Array(byteCharacters.length);
                      for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                      }
                      const byteArray = new Uint8Array(byteNumbers);
                      const blob = new Blob([byteArray], { type: 'application/pdf' });
                      return URL.createObjectURL(blob);
                    } catch (error) {
                      return '';
                    }
                  })()}
                  className="w-full h-[calc(100vh-160px)] border-0"
                  title={documentName}
                />
              ) : (
                <div className="text-center py-12 p-8 bg-white h-full flex flex-col justify-center">
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
            </>
          ) : (
            <div className="text-center py-12 p-4 bg-white h-full flex flex-col justify-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-orange-500 mb-4" />
              <p className="text-slate-600">Documento não encontrado</p>
            </div>
          )}
        </main>

        {/* Navegação inferior */}
        <BottomNavigation />
      </div>
    );
  }

  // Para desktop, retornar apenas o conteúdo interno sem layout wrapper
  return (
    <div className="p-6 h-full">
      {/* Barra de ações simples */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={goBack}
          className="flex items-center gap-2 bg-white border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="flex-1"></div>
        <Button
          onClick={downloadDocument}
          disabled={!documentData}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>

      {/* Área de visualização do documento */}
      <div className="bg-white rounded-lg shadow-sm h-[calc(100%-72px)]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Carregando documento...</p>
            </div>
          </div>
        ) : documentData ? (
          <>
            {isImage ? (
              <div className="h-full p-8 overflow-auto flex justify-center items-center bg-slate-50 rounded-lg">
                <img 
                  src={documentData} 
                  alt={documentName}
                  className="max-w-full max-h-full object-contain cursor-pointer shadow-lg rounded-lg"
                  onClick={downloadDocument}
                  title="Clique para baixar a imagem"
                />
              </div>
            ) : isPDF ? (
              <iframe
                src={(() => {
                  try {
                    const base64Data = documentData.split(',')[1];
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    return URL.createObjectURL(blob);
                  } catch (error) {
                    return '';
                  }
                })()}
                className="w-full h-full rounded-lg"
                title={documentName}
              />
            ) : (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <FileText className="w-20 h-20 mx-auto text-blue-600 mb-6" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Documento</h3>
                  <p className="text-slate-600 mb-6">
                    Tipo: {fileType || 'Arquivo'}
                  </p>
                  <Button 
                    onClick={downloadDocument}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Documento
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 mx-auto text-orange-500 mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Documento não encontrado</h3>
              <p className="text-slate-600">Não foi possível carregar o documento solicitado.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}