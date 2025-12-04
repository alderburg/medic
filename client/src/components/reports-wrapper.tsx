
import { useIsMobile } from "@/hooks/use-mobile";
import ReportsDesktop from "@/components/reports-desktop";
import ReportsMobile from "@/components/reports-mobile";

export default function ReportsWrapper() {
  const isMobile = useIsMobile();
  
  // Use consistent component structure to avoid hooks issues
  if (isMobile) {
    return <ReportsMobile />;
  }
  
  return <ReportsDesktop />;
}
