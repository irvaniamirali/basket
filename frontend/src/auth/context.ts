import { createContext } from "react";
import type { RegistrationInput, User } from "../api/types";

export type AuthValue = {
  user: User | null;
  isStaff: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (input: RegistrationInput) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthValue | null>(null);
