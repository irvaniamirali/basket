import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, authTokenKey } from "./client";

describe("API client", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("sends the persisted token using DRF Token authentication", async () => {
    localStorage.setItem(authTokenKey, "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 4, username: "casey" }), {
          status: 200,
        }),
      ),
    );

    await api.profile();

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/auth/me/");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Token test-token",
    );
  });

  it("preserves backend field validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ email: ["This email is already registered."] }),
            { status: 400 },
          ),
        ),
    );

    await expect(
      api.register({
        username: "casey",
        email: "casey@example.com",
        password: "secret",
      }),
    ).rejects.toMatchObject({
      status: 400,
      fieldErrors: { email: ["This email is already registered."] },
    });
  });
});
