import { useIsMobile } from "@/hooks/use-mobile";
import NotificationsMobile from "./notifications-mobile";
import NotificationsDesktop from "./notifications-desktop";
import { DesktopLayout } from "@/components/desktop-layout";

export default function Notifications() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <NotificationsMobile />;
  }

  return (
    <DesktopLayout title="Notificações" subtitle="Gerencie seus alertas e lembretes">
      <NotificationsDesktop />
    </DesktopLayout>
  );
}
