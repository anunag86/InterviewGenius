import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import History from "@/pages/History";
import InterviewDetail from "@/pages/InterviewDetail";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Login from "@/pages/Login";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/history" component={History} />
      <Route path="/interview/:id" component={InterviewDetail} />
      <Route path="/privacy" component={PrivacyPolicy} />
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

