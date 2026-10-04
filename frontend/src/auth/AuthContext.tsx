import { useEffect, useState, type ReactNode } from "react";
import { api, authTokenKey } from "../api/client";
import type { RegistrationInput, User } from "../api/types";
import { AuthContext } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem(authTokenKey)),
  );
  const [token, setToken] = useState(() =>
    localStorage.getItem(authTokenKey),
  );

  useEffect(() => {
    let alive = true;

    if (!token) {
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    api
      .profile()
      .then((profile) => {
        if (!alive) return;
        setUser(profile);
      })
      .catch(() => {
        if (!alive) return;

        localStorage.removeItem(authTokenKey);
        setToken(null);
        setUser(null);
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

    const profile = await api.profile();
    setUser(profile);
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
    }
  }

  const isStaff = Boolean(user?.is_staff);

  return (
    <AuthContext.Provider
      value={{ user, isStaff, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
