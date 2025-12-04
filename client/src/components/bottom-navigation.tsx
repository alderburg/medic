import { Link, useLocation } from "wouter";
import { Home, Pill, Calendar, FlaskConical, BarChart3, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function BottomNavigation() {
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const handleNavigation = (path: string) => {
    if (path === "/reports") {
      // Forçar atualização dos dados antes de navegar para relatórios
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medication-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medication-logs/today"] });
    }
   // navigate(path); // Corrected: navigate is not a function of useLocation
  };

  const navItems = [
    { path: "/home", icon: Home, label: "Início" },
    { path: "/medications", icon: Pill, label: "Remédios" },
    { path: "/appointments", icon: Calendar, label: "Consultas" },
    { path: "/tests", icon: FlaskConical, label: "Exames" },
    { path: "/reports", icon: BarChart3, label: "Relatórios" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 px-4 py-2 pb-12 z-50">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Link key={item.path} href={item.path} onClick={() => handleNavigation(item.path)}>
              <button
                className={cn(
                  "flex flex-col items-center py-2 px-3",
                  isActive
                    ? "text-primary"
                    : "text-slate-400",
                  "md:hover:text-slate-600 md:transition-colors"
                )}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}