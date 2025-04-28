import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication. If the user is not logged in,
 * they will be redirected to the login page.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-gray-700">Loading your profile...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login in useEffect
  }

  return <>{children}</>;
};

export default ProtectedRoute;