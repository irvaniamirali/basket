import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { OrdersPage } from "./OrdersPage";

describe("OrdersPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders backend order totals and order state", async () => {
    vi.spyOn(api, "orders").mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: "abcd1234-0000-0000-0000-000000000000",
          status: "pending",
          total: "37.50",
          created_at: "2026-10-02T10:00:00Z",
          updated_at: "2026-10-02T10:00:00Z",
          items: [],
        },
      ],
    });
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("37.50 Toman")).toBeInTheDocument();
    expect(screen.getByText("Awaiting payment")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ABCD1234/ })).toHaveAttribute(
      "href",
      "/orders/abcd1234-0000-0000-0000-000000000000",
    );
  });
});
