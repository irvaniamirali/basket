import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequireAuth } from "../App";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock("./useAuth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: useAuthMock,
}));

describe("protected routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects unauthenticated visitors to sign in", () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route
            path="/cart"
            element={
              <RequireAuth>
                <p>Private basket</p>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<p>Sign in page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText("Private basket")).not.toBeInTheDocument();
    expect(screen.getByText("Sign in page")).toBeInTheDocument();
  });

  it("shows protected content to an authenticated user", () => {
    useAuthMock.mockReturnValue({ user: { id: 1 }, loading: false });
    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <RequireAuth>
          <p>Private basket</p>
        </RequireAuth>
      </MemoryRouter>,
    );

    expect(screen.getByText("Private basket")).toBeInTheDocument();
  });
});
