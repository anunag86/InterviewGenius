import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import History from "@/pages/History";
import InterviewDetail from "@/pages/InterviewDetail";
import Login from "@/pages/Login";
import { useEffect, useState } from "react";

// Authentication wrapper component to check if user is authenticated
const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/me');
        const data = await response.json();
        
        setIsAuthenticated(data.isAuthenticated);
        
        if (!data.isAuthenticated) {
          // Redirect to login if not authenticated
          setLocation('/login');
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setIsAuthenticated(false);
        setLocation('/login');
      }
    };

    checkAuth();
  }, [setLocation]);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // If authenticated, render the component
  return isAuthenticated ? <Component {...rest} /> : null;
};

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/history">
        {() => <ProtectedRoute component={History} />}
      </Route>
      <Route path="/interview/:id">
        {(params) => <ProtectedRoute component={InterviewDetail} id={params.id} />}
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
