import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import History from "@/pages/History";
import InterviewDetail from "@/pages/InterviewDetail";
import PrivacyPolicy from "@/pages/PrivacyPolicy";

function Router() {
  return (
    <Switch>
      <Route path="/privacy" component={PrivacyPolicy} />
      
      {/* Main Routes - no authentication required */}
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/history" component={History} />
      <Route path="/interview/:id">
        {params => (
          <ProtectedRoute
            path="/interview/:id"
            component={() => <InterviewDetail id={params.id} />}
          />
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
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

