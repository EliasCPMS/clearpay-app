import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useLocation } from "wouter";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "rep";
  avatarUrl?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  idleWarning: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE = "/api";

const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const WARN_BEFORE_MS = 2 * 60 * 1000;
const WARN_AT_MS = IDLE_TIMEOUT_MS - WARN_BEFORE_MS;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [idleWarning, setIdleWarning] = useState(false);
  const [, setLocation] = useLocation();

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
  }, []);

  const doLogout = useCallback(async () => {
    clearTimers();
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
    setIdleWarning(false);
    setLocation("/login");
  }, [clearTimers, setLocation]);

  const resetIdleTimer = useCallback(() => {
    if (!user) return;
    clearTimers();
    setIdleWarning(false);
    warnTimerRef.current = setTimeout(() => setIdleWarning(true), WARN_AT_MS);
    logoutTimerRef.current = setTimeout(() => doLogout(), IDLE_TIMEOUT_MS);
  }, [user, clearTimers, doLogout]);

  const extendSession = useCallback(() => {
    resetIdleTimer();
  }, [resetIdleTimer]);

  useEffect(() => {
    if (!user) {
      clearTimers();
      return;
    }
    resetIdleTimer();
    const handler = () => resetIdleTimer();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handler));
    };
  }, [user, resetIdleTimer, clearTimers]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Login failed");
    }

    const data: AuthUser = await res.json();
    setUser(data);
    setLocation("/");
  };

  const logout = async () => {
    clearTimers();
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    setIdleWarning(false);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAdmin: user?.role === "admin", idleWarning, login, logout, extendSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
