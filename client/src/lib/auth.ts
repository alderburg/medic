import { User } from "@shared/schema";

export interface AuthUser extends Omit<User, 'password'> {}

export const getStoredToken = (): string | null => {
  return localStorage.getItem("token");
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem("token", token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem("token");
};

export const isAuthenticated = (): boolean => {
  return !!getStoredToken();
};
