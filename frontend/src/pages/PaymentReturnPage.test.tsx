import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "../api/client";
import { PaymentReturnPage } from "./PaymentReturnPage";

vi.mock("../auth/useAuth", () => ({
  useAuth: () => ({ user: { id: 1 } }),
}));

describe("PaymentReturnPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows success only after the backend returns a paid payment", async () => {
    vi.spyOn(api, "paymentCallback").mockResolvedValue({
      payment_id: "payment-1",
      status: "paid",
      reference_id: "201",
    });
    vi.spyOn(api, "payment").mockResolvedValue({
      id: "payment-1",
      order_id: "order-1",
      provider: "zarinpal",
      status: "paid",
      amount_rials: 12000,
      reference_id: "201",
      created_at: "2026-10-02T10:00:00Z",
      updated_at: "2026-10-02T10:00:00Z",
      verified_at: "2026-10-02T10:01:00Z",
    });
    render(
      <MemoryRouter
        initialEntries={["/payment/return?Authority=authority&Status=OK"]}
      >
        <PaymentReturnPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "All settled." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(api.paymentCallback).toHaveBeenCalledWith("authority", "OK");
  });

  it("does not label an unverified callback as paid", async () => {
    vi.spyOn(api, "paymentCallback").mockResolvedValue({
      payment_id: "payment-2",
      status: "canceled",
      reference_id: null,
    });
    vi.spyOn(api, "payment").mockResolvedValue({
      id: "payment-2",
      order_id: "order-2",
      provider: "zarinpal",
      status: "canceled",
      amount_rials: 12000,
      reference_id: "",
      created_at: "2026-10-02T10:00:00Z",
      updated_at: "2026-10-02T10:01:00Z",
      verified_at: null,
    });
    render(
      <MemoryRouter
        initialEntries={["/payment/return?Authority=authority&Status=NOK"]}
      >
        <PaymentReturnPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Payment canceled." }),
    ).toBeInTheDocument();
    expect(screen.queryByText("All settled.")).not.toBeInTheDocument();
  });

  it("shows an unknown state when the backend does not recognize the authority", async () => {
    vi.spyOn(api, "paymentCallback").mockRejectedValue(
      new ApiError(404, "Payment not found."),
    );
    render(<MemoryRouter initialEntries={["/payment/return?Authority=unknown&Status=OK"]}><PaymentReturnPage /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "We couldn’t identify this payment." })).toBeInTheDocument();
  });
});
