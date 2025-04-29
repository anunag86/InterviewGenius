import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import History from "@/pages/History";
import InterviewDetail from "@/pages/InterviewDetail";
import Login from "@/pages/Login";
import LinkedInDiagnostics from "@/pages/LinkedInDiagnostics";
import LinkedInTokenTest from "@/pages/LinkedInTokenTest";
import { useEffect, useState } from "react";

// Authentication wrapper component to check if user is authenticated
const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('ProtectedRoute: Checking authentication status...');
        const response = await fetch('/api/auth/status');
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('ProtectedRoute: Auth check result:', data);
        
        setIsAuthenticated(data.isAuthenticated);
        
        if (!data.isAuthenticated) {
          console.log('ProtectedRoute: Not authenticated, redirecting to login...');
          // Redirect to login if not authenticated
          setLocation('/login');
        }
      } catch (err) {
        console.error('ProtectedRoute: Auth check error:', err);
        setError('Authentication verification failed. Please try again.');
        setIsAuthenticated(false);
        setLocation('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [setLocation]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show error state if something went wrong
  if (error && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 max-w-md">
          <div className="text-destructive mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium mb-2">Authentication Error</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            onClick={() => setLocation('/login')}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // If authenticated, render the component
  return isAuthenticated ? <Component {...rest} /> : null;
};

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/linkedin-diagnostics" component={LinkedInDiagnostics} />
      <Route path="/linkedin-token-test" component={LinkedInTokenTest} />
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
