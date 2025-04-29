import React, { createContext, useContext, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePictureUrl?: string;
  linkedinProfileUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginError: string | null;
  login: () => void;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch current user on mount
  useEffect(() => {
    const initAuth = async () => {
      await fetchCurrentUser();
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const fetchCurrentUser = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/me");
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return true;
      } else {
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      setUser(null);
      return false;
    }
  };

  const login = async () => {
    try {
      // Clear any previous login errors
      setLoginError(null);
      setIsLoading(true);
      
      const response = await fetch("/api/auth/linkedin/url");
      
      if (!response.ok) {
        throw new Error("Failed to get LinkedIn authorization URL");
      }
      
      const { url } = await response.json();
      
      // Redirect to LinkedIn authorization page
      window.location.href = url;
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Could not connect to LinkedIn. Please check your internet connection and try again.");
      toast({
        title: "Authentication Error",
        description: "Could not connect to LinkedIn. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      
      if (response.ok) {
        setUser(null);
        // Redirect to login page
        window.location.href = "/auth";
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Error",
        description: "Could not log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginError,
        login,
        logout,
        fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
};