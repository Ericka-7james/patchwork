import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Signup from "../../pages/Signup";

const { signUpMock } = vi.hoisted(() => ({
  signUpMock: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: signUpMock,
    },
  },
}));

function renderSignup() {
  render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>
  );
}

async function fillValidForm(user) {
  await user.type(screen.getByLabelText(/first name/i), "Ericka");
  await user.type(screen.getByLabelText(/last name/i), "James");
  await user.type(screen.getByLabelText(/username/i), "patchuser");
  await user.type(
    screen.getByLabelText(/email address/i),
    "user@example.com"
  );
  await user.type(
    screen.getByLabelText(/^password$/i),
    "S3cure!Pass"
  );
  await user.type(
    screen.getByLabelText(/confirm password/i),
    "S3cure!Pass"
  );
}

describe("Signup", () => {
  beforeEach(() => {
    signUpMock.mockReset();
  });

  it("renders the signup form", () => {
    renderSignup();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /welcome to patchwork/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("renders the shared auth header", () => {
    renderSignup();

    expect(
      screen.getByRole("link", { name: "PatchWork" })
    ).toHaveAttribute("href", "/");

    expect(
      screen.getByRole("button", { name: /back/i })
    ).toBeInTheDocument();

    const authNavigation = screen.getByRole("navigation", {
      name: /authentication navigation/i,
    });

    expect(
      within(authNavigation).getByRole("link", { name: /log in/i })
    ).toHaveAttribute("href", "/login");
  });

  it("renders the footer", () => {
    renderSignup();

    expect(
      screen.getByText(/© 2026 PatchWork · Ericka James/i)
    ).toBeInTheDocument();
  });

  it("shows an error when passwords do not match", async () => {
    const user = userEvent.setup();

    renderSignup();

    await user.type(screen.getByLabelText(/first name/i), "Ericka");
    await user.type(screen.getByLabelText(/last name/i), "James");
    await user.type(screen.getByLabelText(/username/i), "patchuser");
    await user.type(
      screen.getByLabelText(/email address/i),
      "user@example.com"
    );

    await user.type(
      screen.getByLabelText(/^password$/i),
      "S3cure!Pass"
    );

    await user.type(
      screen.getByLabelText(/confirm password/i),
      "Different123!"
    );

    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    expect(
      screen.getByText(/passwords do not match/i)
    ).toBeInTheDocument();

    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("shows password validation errors before calling Supabase", async () => {
    const user = userEvent.setup();

    renderSignup();

    await user.type(screen.getByLabelText(/first name/i), "Ericka");
    await user.type(screen.getByLabelText(/last name/i), "James");
    await user.type(screen.getByLabelText(/username/i), "patch");
    await user.type(
      screen.getByLabelText(/email address/i),
      "user@example.com"
    );

    await user.type(
      screen.getByLabelText(/^password$/i),
      "patch"
    );

    await user.type(
      screen.getByLabelText(/confirm password/i),
      "patch"
    );

    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    expect(
      screen.getByText(/password must be at least 9 characters long/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/password cannot contain your username/i)
    ).toBeInTheDocument();

    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("calls Supabase with normalized signup data", async () => {
    const user = userEvent.setup();

    signUpMock.mockResolvedValue({
      error: null,
    });

    renderSignup();

    await user.type(
      screen.getByLabelText(/first name/i),
      "  Ericka  "
    );

    await user.type(
      screen.getByLabelText(/last name/i),
      "  James  "
    );

    await user.type(
      screen.getByLabelText(/username/i),
      "  PatchUser  "
    );

    await user.type(
      screen.getByLabelText(/email address/i),
      "  USER@example.com  "
    );

    await user.type(
      screen.getByLabelText(/^password$/i),
      "S3cure!Pass"
    );

    await user.type(
      screen.getByLabelText(/confirm password/i),
      "S3cure!Pass"
    );

    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    expect(signUpMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "S3cure!Pass",
      options: {
        data: {
          username: "patchuser",
          first_name: "Ericka",
          last_name: "James",
        },
      },
    });
  });

  it("shows the confirmation message after successful signup", async () => {
    const user = userEvent.setup();

    signUpMock.mockResolvedValue({
      error: null,
    });

    renderSignup();

    await fillValidForm(user);

    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    expect(
      await screen.findByText(
        /your account was created\. check your email to confirm your address before signing in/i
      )
    ).toBeInTheDocument();
  });

  it("shows Supabase errors to the user", async () => {
    const user = userEvent.setup();

    signUpMock.mockResolvedValue({
      error: {
        message: "Unable to create account",
      },
    });

    renderSignup();

    await fillValidForm(user);

    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    expect(
      await screen.findByText(/unable to create account/i)
    ).toBeInTheDocument();
  });
});