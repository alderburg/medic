import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { PatientProvider } from "./contexts/patient-context";
import ProtectedRoute from "./components/protected-route";
import { WebSocketProvider } from "./components/websocket-provider";
import { DesktopLayout } from "./components/desktop-layout";
import Login from "./pages/login";
import Register from "./pages/register";
import ForgotPassword from "./pages/forgot-password";
import Home from "./pages/home";
import Medications from "./pages/medications";
import Appointments from "./pages/appointments";
import MedicalEvolutions from "./pages/medical-evolutions";
import Tests from "./pages/tests";
import Reports from "./pages/reports";
import HealthInsurances from "./pages/health-insurances";
import PaymentMethods from "./pages/payment-methods";

import Settings from "./pages/settings";
import Notifications from "./pages/notifications";
import NotificationsDesktop from "./pages/notifications-desktop";
import NotificationsMobile from "./pages/notifications-mobile";
import NotFound from "./pages/not-found";
import Pressure from "./pages/vital-signs/pressure";
import Glucose from "./pages/vital-signs/glucose";
import HeartRate from "./pages/vital-signs/heart-rate";
import Temperature from "./pages/vital-signs/temperature";
import Weight from "./pages/vital-signs/weight";
import VitalSigns from "./pages/vital-signs";
import Prescriptions from "./pages/prescriptions";
import DocumentViewerPage from "./pages/document-viewer";
import Landing from "./pages/landing";

function Router() {
  return (
    <Switch>
      <Route path="/landing" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/" component={Landing} />
      <Route path="/home">
        <ProtectedRoute>
          <DesktopLayout title="Dashboard" subtitle="Visão geral do sistema">
            <Home />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/visao-geral">
        <ProtectedRoute>
          <DesktopLayout title="Visão Geral do Paciente" subtitle="Visão geral dos dados do paciente">
            <Home />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/medications">
        <ProtectedRoute>
          <DesktopLayout title="Medicamentos" subtitle="Gerencie seus medicamentos e receitas médicas">
            <Medications />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/appointments">
        <ProtectedRoute>
          <DesktopLayout title="Consultas Médicas" subtitle="Organize suas consultas médicas">
            <Appointments />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/medical-evolutions">
        <ProtectedRoute>
          <DesktopLayout title="Evoluções Médicas" subtitle="Gerencie evoluções e registros médicos">
            <MedicalEvolutions />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tests">
        <ProtectedRoute>
          <DesktopLayout title="Exames Médicos" subtitle="Gerencie seus exames e receitas médicas">
            <Tests />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          <DesktopLayout title="Relatórios" subtitle="Acompanhe sua aderência ao tratamento">
            <Reports />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/convenios">
        <ProtectedRoute>
          <DesktopLayout title="Convênios Médicos" subtitle="Gerencie seus convênios e planos de saúde">
            <HealthInsurances />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/formas-pagamento">
        <ProtectedRoute>
          <DesktopLayout title="Formas de Pagamento" subtitle="Gerencie as formas de pagamento aceitas em sua clínica">
            <PaymentMethods />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <DesktopLayout>
            <Settings />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/notifications">
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      </Route>
      <Route path="/vital-signs">
        <ProtectedRoute>
          <DesktopLayout title="Sinais Vitais" subtitle="Monitore seus sinais vitais">
            <VitalSigns />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/pressure">
        <ProtectedRoute>
          <DesktopLayout>
            <Pressure />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/vital-signs/pressure">
        <ProtectedRoute>
          <DesktopLayout>
            <Pressure />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/glucose">
        <ProtectedRoute>
          <DesktopLayout>
            <Glucose />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/vital-signs/glucose">
        <ProtectedRoute>
          <DesktopLayout>
            <Glucose />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/heart-rate">
        <ProtectedRoute>
          <DesktopLayout>
            <HeartRate />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/vital-signs/heart-rate">
        <ProtectedRoute>
          <DesktopLayout>
            <HeartRate />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/temperature">
        <ProtectedRoute>
          <DesktopLayout>
            <Temperature />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/vital-signs/temperature">
        <ProtectedRoute>
          <DesktopLayout>
            <Temperature />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/weight">
        <ProtectedRoute>
          <DesktopLayout>
            <Weight />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/vital-signs/weight">
        <ProtectedRoute>
          <DesktopLayout>
            <Weight />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/prescriptions">
        <ProtectedRoute>
          <DesktopLayout title="Receitas Médicas" subtitle="Organize suas receitas médicas">
            <Prescriptions />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/document-viewer/:documentType/:documentId">
        <ProtectedRoute>
          <DesktopLayout title="Visualizar Documento" subtitle="Visualize e baixe seus documentos médicos">
            <DocumentViewerPage />
          </DesktopLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <PatientProvider>
            <WebSocketProvider>
              <Toaster />
              <Router />
            </WebSocketProvider>
          </PatientProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;