import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { AuthPage } from "./AuthPage";

const { loginMock, registerMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  registerMock: vi.fn(),
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: () => ({ user: null, login: loginMock, register: registerMock }),
}));

describe("AuthPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects to the requested protected destination after login", async () => {
    loginMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/login?next=%2Fcart"]}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/cart" element={<p>Basket contents</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Username"), "casey");
    await user.type(screen.getByLabelText(/Password/), "a-secure-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(loginMock).toHaveBeenCalledWith("casey", "a-secure-password");
    expect(await screen.findByText("Basket contents")).toBeInTheDocument();
  });

  it("shows field-level registration errors from the backend", async () => {
    registerMock.mockRejectedValue(
      new ApiError(400, "Please review your details.", {
        email: ["This email is already registered."],
      }),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthPage mode="register" />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Username"), "casey");
    await user.type(screen.getByLabelText("Email"), "casey@example.com");
    await user.type(screen.getByLabelText(/Password/), "a-secure-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("This email is already registered."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please review your details.",
    );
  });
});
