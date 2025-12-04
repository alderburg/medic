import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@shared/schema";
import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  switchUser: (userId: number) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get("/api/auth/me");
      setUser(response.data.user);
    } catch (error: any) {
      console.error("Error fetching user:", error);

      // Only logout if the error is actually an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("token");
        delete api.defaults.headers.common["Authorization"];
        setUser(null);
      }
      // For other errors (like 502), keep the user logged in
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post("/api/auth/login", { email, password });
      const { user, token } = response.data;

      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(user);

      // Try to refresh user data, but don't fail the login if this fails
      try {
        await fetchUser();
      } catch (refreshError) {
        console.warn("Warning: Failed to refresh user data after login, but login was successful:", refreshError);
        // Keep the user data from login response even if refresh fails
      }

      // Redirect all users to home page
      setLocation("/home");
    } catch (error: any) {
      // Não logar erros 401 (credenciais inválidas) no console pois são esperados
      if (error.response?.status !== 401) {
        console.error("Login error:", error);
      }
      // Extract the actual error message from the server response
      const errorMessage = error.response?.data?.message || "Email ou senha inválidos";
      throw new Error(errorMessage);
    }
  };

  const register = async (userData: any) => {
    const response = await api.post("/api/auth/register", userData);
    const { user, token } = response.data;

    localStorage.setItem("token", token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);

    // Clear all React Query cache to prevent showing previous user data
    queryClient.clear();

    setLocation("/login");
  };

  const switchUser = async (userId: number) => {
    try {
      const response = await api.post('/api/caregiver/switch-patient', { 
        patientId: userId 
      });

      if (response.data) {
        // Refresh user data to get updated context
        await refreshUser();
      }

      return response.data;
    } catch (error) {
      console.error('Error switching user context:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, switchUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}