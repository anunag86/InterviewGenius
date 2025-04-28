import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import History from "@/pages/History";
import InterviewDetail from "@/pages/InterviewDetail";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Login from "@/pages/Login";
import LinkedInCallback from "@/pages/LinkedInCallback";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/auth/callback" component={LinkedInCallback} />
      
      {/* Protected Routes - require authentication */}
      <Route path="/">
        {() => (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/history">
        {() => (
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/interview/:id">
        {(params) => (
          <ProtectedRoute>
            <InterviewDetail id={params.id} />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

