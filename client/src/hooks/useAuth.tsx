import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { useLocation } from "wouter";
import { getCurrentUser, getLinkedInAuthUrl, logout, UserProfile } from "@/lib/auth";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Load user on initial mount
  useEffect(() => {
    async function loadUser() {
      try {
        setIsLoading(true);
        const userProfile = await getCurrentUser();
        setUser(userProfile);
      } catch (err) {
        setError("Failed to load user profile");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  // Login function - redirects to LinkedIn OAuth flow
  const handleLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const authUrl = await getLinkedInAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      setError("Failed to initiate login");
      console.error(err);
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      await logout();
      setUser(null);
      setLocation("/login");
    } catch (err) {
      setError("Failed to logout");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [setLocation]);

  const value = {
    user,
    isLoading,
    error,
    login: handleLogin,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}