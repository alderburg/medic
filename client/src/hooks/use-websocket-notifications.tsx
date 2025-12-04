import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './use-websocket';

export function useWebSocketNotifications() {
  const { isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  const [lastNotification, setLastNotification] = useState<any>(null);

  useEffect(() => {
    if (!isConnected) return;

    const handleEnterpriseNotification = (event: CustomEvent) => {
      console.log('🔔 Nova notificação enterprise recebida via WebSocket:', event.detail);
      setLastNotification(event.detail);
      
      // Invalidar queries de notificações para atualizar o UI
      queryClient.invalidateQueries({
        queryKey: ['/api/notifications']
      });
      
      // Invalidar outras queries relacionadas se necessário
      queryClient.invalidateQueries({
        queryKey: ['/api/medication-logs']
      });
    };

    const handleRealtimeUpdate = (event: CustomEvent) => {
      console.log('📊 Update em tempo real via WebSocket:', event.detail);
      const { type, data } = event.detail;
      
      if (type === 'notification_created') {
        // Invalidar queries de notificações
        queryClient.invalidateQueries({
          queryKey: ['/api/notifications']
        });
      } else if (type === 'medication_updated' || type === 'medication_created') {
        // Invalidar queries de medicamentos
        queryClient.invalidateQueries({
          queryKey: ['/api/medications']
        });
        queryClient.invalidateQueries({
          queryKey: ['/api/medication-logs']
        });
      }
    };

    // Escutar eventos customizados do WebSocket
    window.addEventListener('enterprise_notification', handleEnterpriseNotification as EventListener);
    window.addEventListener('realtime_update', handleRealtimeUpdate as EventListener);

    return () => {
      window.removeEventListener('enterprise_notification', handleEnterpriseNotification as EventListener);
      window.removeEventListener('realtime_update', handleRealtimeUpdate as EventListener);
    };
  }, [isConnected, queryClient]);

  return {
    isConnected,
    lastNotification
  };
}