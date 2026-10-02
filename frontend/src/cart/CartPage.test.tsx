import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartPage } from "../pages/CartPage";

const { useCartMock, updateMock } = vi.hoisted(() => ({
  useCartMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("./useCart", () => ({
  CartProvider: ({ children }: { children: ReactNode }) => children,
  useCart: useCartMock,
}));

describe("CartPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartMock.mockReturnValue({
      cart: {
        id: "cart-1",
        total: "25.00",
        created_at: "2026-10-02T10:00:00Z",
        updated_at: "2026-10-02T10:00:00Z",
        items: [
          {
            id: "line-1",
            product: {
              id: "p-1",
              name: "Woven tote",
              slug: "woven-tote",
              price: "12.50",
              stock: 8,
              is_active: true,
            },
            quantity: 2,
            unit_price: "12.50",
            line_total: "25.00",
            created_at: "2026-10-02T10:00:00Z",
            updated_at: "2026-10-02T10:00:00Z",
          },
        ],
      },
      loading: false,
      error: null,
      update: updateMock,
      remove: vi.fn(),
      clear: vi.fn(),
    });
  });

  it("shows server totals and sends quantity changes to the cart API action", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("25.00 Toman")).toHaveLength(3);
    await user.click(
      screen.getByRole("button", { name: "Increase Woven tote quantity" }),
    );

    expect(updateMock).toHaveBeenCalledWith("line-1", 3);
  });
});
