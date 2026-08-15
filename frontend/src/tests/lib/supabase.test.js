import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, supabaseClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  supabaseClientMock: {
    auth: {},
    from: vi.fn(),
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

describe("supabase client", () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();

    createClientMock.mockReturnValue(supabaseClientMock);

    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  });

  it("creates the Supabase client with Vite environment values", async () => {
    await import("../../lib/supabase");

    expect(createClientMock).toHaveBeenCalledOnce();

    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-publishable-key"
    );
  });

  it("exports the created Supabase client", async () => {
    const { supabase } = await import("../../lib/supabase");

    expect(supabase).toBe(supabaseClientMock);
  });
});
