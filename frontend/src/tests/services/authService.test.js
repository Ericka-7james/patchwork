import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithOAuthMock } = vi.hoisted(() => ({
  signInWithOAuthMock: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithOAuth: signInWithOAuthMock,
    },
  },
}));

import { signInWithGoogle } from "../../services/authService";

describe("authService", () => {
  beforeEach(() => {
    signInWithOAuthMock.mockReset();
  });

  it("starts Google OAuth with the dashboard redirect", async () => {
    const oauthData = {
      provider: "google",
      url: "https://accounts.google.com",
    };

    signInWithOAuthMock.mockResolvedValue({
      data: oauthData,
      error: null,
    });

    const result = await signInWithGoogle();

    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: "google",

      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    expect(result).toEqual(oauthData);
  });

  it("throws Google OAuth errors", async () => {
    signInWithOAuthMock.mockResolvedValue({
      data: null,

      error: {
        message: "Google OAuth failed",
      },
    });

    await expect(signInWithGoogle()).rejects.toThrow("Google OAuth failed");
  });

  it("uses the fallback Google OAuth error message", async () => {
    signInWithOAuthMock.mockResolvedValue({
      data: null,
      error: {},
    });

    await expect(signInWithGoogle()).rejects.toThrow(
      "Unable to continue with Google."
    );
  });
});
