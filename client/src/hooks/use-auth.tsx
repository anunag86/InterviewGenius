import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  email?: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.status === 401) {
          return null;
        }
        if (!response.ok) {
          throw new Error(`Error fetching user: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }
      
      return await response.json();
    },
    onSuccess: (user: User) => {
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      queryClient.setQueryData(["/api/auth/me"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Registration failed");
      }
      
      return await response.json();
    },
    onSuccess: (user: User) => {
      toast({
        title: "Registration successful",
        description: "Your account has been created!",
      });
      queryClient.setQueryData(["/api/auth/me"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Logout failed");
      }
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      queryClient.setQueryData(["/api/auth/me"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}