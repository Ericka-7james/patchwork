import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthContext from "../../context/AuthContextBase";
import { useAuth } from "../../context/useAuth";

function AuthConsumer() {
  const auth = useAuth();

  return <span>{auth.profile.first_name}</span>;
}

describe("useAuth", () => {
  it("returns the current authentication context", () => {
    const contextValue = {
      session: null,
      user: {
        id: "user-123",
      },
      profile: {
        first_name: "Ericka",
      },
      isLoading: false,
      isProfileLoading: false,
      signOut: () => {},
    };

    render(
      <AuthContext.Provider value={contextValue}>
        <AuthConsumer />
      </AuthContext.Provider>
    );

    expect(screen.getByText("Ericka")).toBeInTheDocument();
  });

  it("throws when used outside an AuthProvider", () => {
    expect(() => render(<AuthConsumer />)).toThrow(
      "useAuth must be used within an AuthProvider."
    );
  });
});
