import { useEffect, useState, type ReactNode } from "react";
import { api, authTokenKey, ApiError } from "../api/client";
import type { RegistrationInput, User } from "../api/types";
import { AuthContext } from "./context";

async function readStaffCapability(): Promise<boolean> {
  try {
    const metadata = await api.productWriteCapability();
    return Boolean(metadata.actions?.POST);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return false;
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem(authTokenKey)),
  );
  const [token, setToken] = useState(() => localStorage.getItem(authTokenKey));

  useEffect(() => {
    let alive = true;
    if (!token)
      return () => {
        alive = false;
      };
    Promise.all([api.profile(), readStaffCapability()])
      .then(([profile, staff]) => {
        if (!alive) return;
        setUser(profile);
        setIsStaff(staff);
      })
      .catch(() => {
        if (!alive) return;
        localStorage.removeItem(authTokenKey);
        setToken(null);
        setUser(null);
        setIsStaff(false);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  async function login(username: string, password: string) {
    const result = await api.login(username, password);
    localStorage.setItem(authTokenKey, result.token);
    setToken(result.token);
    const [profile, staff] = await Promise.all([
      api.profile(),
      readStaffCapability(),
    ]);
    setUser(profile);
    setIsStaff(staff);
  }

  async function register(input: RegistrationInput) {
    await api.register(input);
    await login(input.username, input.password);
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      localStorage.removeItem(authTokenKey);
      setToken(null);
      setUser(null);
      setIsStaff(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isStaff, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
