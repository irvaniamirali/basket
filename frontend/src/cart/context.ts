import { createContext } from "react";
import type { Cart } from "../api/types";

export type CartValue = {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  add: (productId: string, quantity: number) => Promise<void>;
  update: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
};

export const CartContext = createContext<CartValue | null>(null);
