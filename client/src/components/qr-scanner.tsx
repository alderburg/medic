
import { useState, useRef } from 'react';
import { X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function QRScanner({ onScan, onClose, isOpen }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError('');
      
      // Solicitar permissão para câmera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Usar câmera traseira preferencialmente
          width: { ideal: 300 },
          height: { ideal: 300 }
        }
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Para demonstração, vamos simular a detecção de QR code após 3 segundos
      setTimeout(() => {
        const mockQRCode = 'share_8_1751845123456_abc123def';
        onScan(mockQRCode);
        stopCamera();
      }, 3000);

    } catch (err) {
      setHasPermission(false);
      setError('Erro ao acessar a câmera. Verifique as permissões.');
      
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Scanner QR Code</h3>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            {hasPermission === null && (
              <div className="text-center py-8">
                <Camera className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 mb-4">
                  Clique para ativar a câmera e escanear o QR code
                </p>
                <Button onClick={startCamera} className="w-full">
                  <Camera className="w-4 h-4 mr-2" />
                  Ativar Câmera
                </Button>
              </div>
            )}

            {hasPermission === false && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <X className="w-8 h-8 text-red-600" />
                </div>
                <p className="text-red-600 mb-4">{error}</p>
                <Button variant="outline" onClick={startCamera} className="w-full">
                  Tentar Novamente
                </Button>
              </div>
            )}

            {hasPermission === true && (
              <div className="space-y-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-64 bg-black rounded-lg object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                  
                  {/* Overlay com guia para QR code */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-2">
                    Posicione o QR code dentro do quadrado
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-blue-600 font-medium">Escaneando...</span>
                  </div>
                </div>

                <Button variant="outline" onClick={handleClose} className="w-full">
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
