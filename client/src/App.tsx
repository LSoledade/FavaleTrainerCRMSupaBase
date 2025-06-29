import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage";
import LeadsPage from "@/pages/LeadsPage";
import AuthPage from "@/pages/AuthPage";
import ConfigPage from "@/pages/ConfigPage";
import SessionsPage from "@/pages/SessionsPage";
import CalendarPage from "@/pages/CalendarPage";
import ProfessorsPage from "@/pages/ProfessorsPage";
import WhatsappPage from "@/pages/WhatsappPage";
import WhatsappConfigPage from "@/pages/WhatsappConfigPage";
import ReportPage from "@/pages/ReportPage";
import TasksPage from "@/pages/TasksPage";
import TaskDetailsPage from "@/pages/TaskDetailsPage";
import { FavaleIAPage } from "@/pages/FavaleIAPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/theme-provider";
import { LeadProvider } from "@/context/LeadContext";
import { WhatsappProvider } from "@/context/WhatsappContext";
import { TaskProvider } from "@/context/TaskContext";
import { AuthProvider } from "@/hooks/use-auth";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import ErrorBoundary from "@/components/ErrorBoundary"; // Adicionado ErrorBoundary

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/leads" component={LeadsPage} />
      <ProtectedRoute path="/agendamentos" component={SessionsPage} />
      <ProtectedRoute path="/calendario" component={CalendarPage} />
      <ProtectedRoute path="/professores" component={ProfessorsPage} />
      <ProtectedRoute path="/whatsapp" component={WhatsappPage} />
      <ProtectedRoute path="/whatsapp/config" component={WhatsappConfigPage} />
      <ProtectedRoute path="/favale-ia" component={FavaleIAPage} />
      <ProtectedRoute path="/tarefas" component={TasksPage} />
      <ProtectedRoute path="/tarefas/:id" component={TaskDetailsPage} />
      <ProtectedRoute path="/config" component={ConfigPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/politica-de-privacidade" component={PrivacyPolicyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isAuthPage = location === "/auth";

  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <LeadProvider>
            <WhatsappProvider>
              <TaskProvider>
                {isAuthPage ? (
                  <Router />
                ) : (
                  <Layout>
                    <Router />
                  </Layout>
                )}
                <Toaster />
              </TaskProvider>
            </WhatsappProvider>
          </LeadProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;