import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { AppLayout } from '@/components/layout/AppLayout';
import { ThemeProvider } from '@/components/theme-provider';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import ClinicianDashboard from '@/pages/clinician';
import PatientDetail from '@/pages/patient-detail';
import ElderApp from '@/pages/elder';
import FamilyView from '@/pages/family';
import IntakeScreen from '@/pages/intake';
import ReportScreen from '@/pages/report';
import Welcome from '@/pages/welcome';
import Landing from '@/pages/landing';
import { AccessibilityProvider } from '@/lib/accessibility';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      refetchInterval: 10000,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/clinician" component={ClinicianDashboard} />
          <Route path="/patients/:id" component={PatientDetail} />
          <Route path="/welcome" component={Welcome} />
          <Route path="/elder" component={ElderApp} />
          <Route path="/family" component={FamilyView} />
          <Route path="/intake" component={IntakeScreen} />
          <Route path="/report/:id" component={ReportScreen} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </AppLayout>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="agewell-theme">
      <AccessibilityProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}

export default App;
