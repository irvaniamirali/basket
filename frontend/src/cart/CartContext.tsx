import { useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { Cart } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { CartContext } from "./context";

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [cartRecord, setCartRecord] = useState<{
    userId: number;
    cart: Cart;
  } | null>(null);
  const [errorRecord, setErrorRecord] = useState<{
    userId: number;
    message: string;
  } | null>(null);
  const [refreshingUser, setRefreshingUser] = useState<number | null>(null);
  const cart = userId && cartRecord?.userId === userId ? cartRecord.cart : null;
  const error =
    userId && errorRecord?.userId === userId ? errorRecord.message : null;
  const loading = Boolean(
    userId && ((!cart && !error) || refreshingUser === userId),
  );

  async function refresh() {
    if (!user) {
      return;
    }
    const ownerId = user.id;
    setRefreshingUser(ownerId);
    try {
      setCartRecord({ userId: ownerId, cart: await api.cart() });
      setErrorRecord(null);
    } catch (cause) {
      setErrorRecord({
        userId: ownerId,
        message:
          cause instanceof Error
            ? cause.message
            : "Your cart could not be loaded.",
      });
    } finally {
      setRefreshingUser((current) => (current === ownerId ? null : current));
    }
  }

  useEffect(() => {
    if (!userId) return;
    let current = true;
    api
      .cart()
      .then((result) => {
        if (current) setCartRecord({ userId, cart: result });
      })
      .catch((cause: unknown) => {
        if (current)
          setErrorRecord({
            userId,
            message:
              cause instanceof Error
                ? cause.message
                : "Your cart could not be loaded.",
          });
      });
    return () => {
      current = false;
    };
  }, [userId]);

  async function add(productId: string, quantity: number) {
    if (!userId) throw new Error("Sign in to add items to a basket.");
    setCartRecord({ userId, cart: await api.addCartItem(productId, quantity) });
    setErrorRecord(null);
  }

  async function update(itemId: string, quantity: number) {
    if (!userId) throw new Error("Sign in to update your basket.");
    setCartRecord({ userId, cart: await api.updateCartItem(itemId, quantity) });
    setErrorRecord(null);
  }

  async function remove(itemId: string) {
    await api.removeCartItem(itemId);
    await refresh();
  }

  async function clear() {
    await api.clearCart();
    await refresh();
  }

  return (
    <CartContext.Provider
      value={{ cart, loading, error, refresh, add, update, remove, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}
