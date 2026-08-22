import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, within } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { MemoryRouter } from "react-router-dom";

import Signup from "../../pages/Signup";

const { signUpMock, signInWithGoogleMock, useAuthMock } = vi.hoisted(() => ({
  signUpMock: vi.fn(),
  signInWithGoogleMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: signUpMock,
    },
  },
}));

vi.mock("../../services/authService", () => ({
  signInWithGoogle: signInWithGoogleMock,
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: useAuthMock,
}));

function renderSignup() {
  render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>
  );
}

async function fillSignupForm(
  user,
  {
    firstName = "Ericka",
    lastName = "James",
    username = "patchuser",
    email = "user@example.com",
    phone = "4045551111",
    password = "S3cure!Pass",
    confirmPassword = "S3cure!Pass",
  } = {}
) {
  await user.type(screen.getByLabelText(/first name/i), firstName);

  await user.type(screen.getByLabelText(/last name/i), lastName);

  await user.type(screen.getByLabelText(/username/i), username);

  await user.type(screen.getByLabelText(/email address/i), email);

  await user.type(screen.getByLabelText(/phone number/i), phone);

  await user.type(screen.getByLabelText(/^password$/i), password);

  await user.type(screen.getByLabelText(/confirm password/i), confirmPassword);
}

describe("Signup", () => {
  beforeEach(() => {
    signUpMock.mockReset();
    signInWithGoogleMock.mockReset();
    useAuthMock.mockReset();

    useAuthMock.mockReturnValue({
      hasResume: false,
    });
  });

  it("renders the signup form", () => {
    renderSignup();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /build something stronger from something real/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /welcome to patchwork/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /continue with google/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("renders shared authentication navigation", () => {
    renderSignup();

    expect(
      screen.getByRole("link", {
        name: "PatchWork",
      })
    ).toHaveAttribute("href", "/");

    expect(
      screen.getByRole("button", {
        name: /back/i,
      })
    ).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", {
      name: /authentication navigation/i,
    });

    expect(
      within(navigation).getByRole("link", {
        name: /log in/i,
      })
    ).toHaveAttribute("href", "/login");
  });

  it("renders the PatchWork promise", () => {
    renderSignup();

    expect(screen.getByText(/patchwork promise/i)).toBeInTheDocument();

    expect(
      screen.getByText(/we do not invent experience for you/i)
    ).toBeInTheDocument();
  });

  it("starts Google sign in", async () => {
    const user = userEvent.setup();

    signInWithGoogleMock.mockResolvedValue({
      url: "https://accounts.google.com",
    });

    renderSignup();

    await user.click(
      screen.getByRole("button", {
        name: /continue with google/i,
      })
    );

    expect(signInWithGoogleMock).toHaveBeenCalledOnce();
  });

  it("shows Google sign in errors", async () => {
    const user = userEvent.setup();

    signInWithGoogleMock.mockRejectedValue(
      new Error("Unable to continue with Google.")
    );

    renderSignup();

    await user.click(
      screen.getByRole("button", {
        name: /continue with google/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to continue with google/i
    );
  });

  it("shows an error when passwords do not match", async () => {
    const user = userEvent.setup();

    renderSignup();

    await fillSignupForm(user, {
      confirmPassword: "Different123!",
    });

    await user.click(
      screen.getByRole("button", {
        name: /create account/i,
      })
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /passwords do not match/i
    );

    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("shows password validation errors before calling Supabase", async () => {
    const user = userEvent.setup();

    renderSignup();

    await fillSignupForm(user, {
      username: "patch",
      password: "patch",
      confirmPassword: "patch",
    });

    await user.click(
      screen.getByRole("button", {
        name: /create account/i,
      })
    );

    expect(
      screen.getByText(/password must be at least 9 characters long/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/password cannot contain your username/i)
    ).toBeInTheDocument();

    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("calls Supabase with normalized signup data and phone metadata", async () => {
    const user = userEvent.setup();

    signUpMock.mockResolvedValue({
      error: null,
    });

    renderSignup();

    await fillSignupForm(user, {
      firstName: "  Ericka  ",
      lastName: "  James  ",
      username: "  PatchUser  ",
      email: "  USER@example.com  ",
      phone: "  4045551111  ",
    });

    await user.click(
      screen.getByRole("button", {
        name: /create account/i,
      })
    );

    expect(signUpMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "S3cure!Pass",

      options: {
        data: {
          username: "patchuser",
          first_name: "Ericka",
          last_name: "James",
          phone: "4045551111",
        },
      },
    });
  });

  it("shows confirmation after successful signup", async () => {
    const user = userEvent.setup();

    signUpMock.mockResolvedValue({
      error: null,
    });

    renderSignup();

    await fillSignupForm(user);

    await user.click(
      screen.getByRole("button", {
        name: /create account/i,
      })
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      /your account was created\. check your email to confirm your address before signing in/i
    );
  });

  it("clears the form after successful signup", async () => {
    const user = userEvent.setup();

    signUpMock.mockResolvedValue({
      error: null,
    });

    renderSignup();

    await fillSignupForm(user);

    await user.click(
      screen.getByRole("button", {
        name: /create account/i,
      })
    );

    await screen.findByRole("status");

    expect(screen.getByLabelText(/first name/i)).toHaveValue("");

    expect(screen.getByLabelText(/last name/i)).toHaveValue("");

    expect(screen.getByLabelText(/username/i)).toHaveValue("");

    expect(screen.getByLabelText(/email address/i)).toHaveValue("");

    expect(screen.getByLabelText(/phone number/i)).toHaveValue("");

    expect(screen.getByLabelText(/^password$/i)).toHaveValue("");

    expect(screen.getByLabelText(/confirm password/i)).toHaveValue("");
  });

  it("shows Supabase errors to the user", async () => {
    const user = userEvent.setup();

    signUpMock.mockResolvedValue({
      error: {
        message: "Unable to create account",
      },
    });

    renderSignup();

    await fillSignupForm(user);

    await user.click(
      screen.getByRole("button", {
        name: /create account/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to create account/i
    );
  });
});
