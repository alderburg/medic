import { useIsMobile } from "@/hooks/use-mobile";
import { usePatientRequired } from "@/hooks/use-patient-required";
import VitalSignsDesktopUnified from "@/components/vital-signs-desktop-unified";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, Thermometer, Weight, Droplets, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNavigation from "@/components/bottom-navigation";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";

export default function VitalSignsPage() {
  const isMobile = useIsMobile();
  const { shouldShowPage, isRedirecting } = usePatientRequired();
  const [, navigate] = useLocation();
  const [showLoading, setShowLoading] = useState(true);

  // Se está redirecionando ou não deve mostrar a página
  if (isRedirecting || !shouldShowPage) {
    return null;
  }

  // Redirecionar imediatamente para mobile quando redimensionar para mobile
  useEffect(() => {
    if (isMobile) {
      // Ir direto para pressão sem mostrar esta tela
      navigate('/vital-signs/pressure');
    }
  }, [isMobile, navigate]);

  // Force loading skeleton for at least 1 second when page loads
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Don't fetch vital signs data on mobile index page - it redirects immediately anyway
  // This prevents unnecessary API calls and infinite loops
  const pressureReadings: any[] = [];
  const glucoseReadings: any[] = [];
  const heartRateReadings: any[] = [];
  const temperatureReadings: any[] = [];
  const weightReadings: any[] = [];
  
  const pressureLoading = false;
  const glucoseLoading = false;
  const heartRateLoading = false;
  const temperatureLoading = false;
  const weightLoading = false;

  // Show loading if forced loading is active OR any query is loading
  const isLoading = showLoading || pressureLoading || glucoseLoading || heartRateLoading || temperatureLoading || weightLoading;

  // Return desktop version if not mobile
  if (!isMobile) {
    return <VitalSignsDesktopUnified />;
  }

  // Se chegou aqui e é mobile, redirecionar imediatamente
  if (isMobile) {
    navigate('/vital-signs/pressure');
    return null;
  }

  // Show loading skeleton for mobile version - following same pattern as other pages
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="mobile-container flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/home">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                <h1 className="text-lg font-semibold">Sinais Vitais</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="mobile-container flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <BottomNavigation />
      </div>
    );
  }

  // Mobile version - show all vital signs options
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mobile-container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              <h1 className="text-lg font-semibold">Sinais Vitais</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="mobile-container py-6 space-y-4 pb-36">
        <p className="text-sm text-gray-600 mb-6">
          Monitore seus sinais vitais e mantenha um registro completo da sua saúde.
        </p>

        <div className="space-y-4">
          <Link href="/vital-signs/pressure">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <Activity className="h-5 w-5 text-red-600" />
                  </div>
                  Pressão Arterial
                  {Array.isArray(pressureReadings) && pressureReadings.length > 0 && (
                    <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                      {pressureReadings.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600">
                  Monitore sua pressão sistólica e diastólica
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/vital-signs/glucose">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Droplets className="h-5 w-5 text-blue-600" />
                  </div>
                  Glicemia
                  {Array.isArray(glucoseReadings) && glucoseReadings.length > 0 && (
                    <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                      {glucoseReadings.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600">
                  Acompanhe seus níveis de glicose no sangue
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/vital-signs/heart-rate">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className="p-2 bg-rose-50 rounded-lg">
                    <Heart className="h-5 w-5 text-rose-600" />
                  </div>
                  Batimentos Cardíacos
                  {Array.isArray(heartRateReadings) && heartRateReadings.length > 0 && (
                    <span className="ml-auto text-xs bg-rose-100 text-rose-600 px-2 py-1 rounded-full">
                      {heartRateReadings.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600">
                  Registre suas medições de batimentos cardíacos
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/vital-signs/temperature">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Thermometer className="h-5 w-5 text-orange-600" />
                  </div>
                  Temperatura Corporal
                  {Array.isArray(temperatureReadings) && temperatureReadings.length > 0 && (
                    <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                      {temperatureReadings.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600">
                  Monitore sua temperatura corporal
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/vital-signs/weight">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className="p-2 bg-violet-50 rounded-lg">
                    <Weight className="h-5 w-5 text-violet-600" />
                  </div>
                  Peso Corporal
                  {Array.isArray(weightReadings) && weightReadings.length > 0 && (
                    <span className="ml-auto text-xs bg-violet-100 text-violet-600 px-2 py-1 rounded-full">
                      {weightReadings.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600">
                  Acompanhe as variações do seu peso
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}