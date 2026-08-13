import { describe, expect, it } from "vitest";
import { validatePassword } from "../../utils/validatePassword";

const validInput = {
  password: "S3cure!Pass",
  email: "ericka@example.com",
  username: "patchuser",
  firstName: "Ericka",
  lastName: "James",
};

describe("validatePassword", () => {
  it("accepts a valid password", () => {
    const result = validatePassword(validInput);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects passwords shorter than 9 characters", () => {
    const result = validatePassword({
      ...validInput,
      password: "Abc123!",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must be at least 9 characters long."
    );
  });

  it("rejects a password equal to the email address", () => {
    const result = validatePassword({
      ...validInput,
      password: "ericka@example.com",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password cannot be the same as your email address."
    );
  });

  it("rejects a password containing the username", () => {
    const result = validatePassword({
      ...validInput,
      password: "SafePatchUser123!",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password cannot contain your username."
    );
  });

  it("rejects a password containing the email local part", () => {
    const result = validatePassword({
      ...validInput,
      password: "ErickaSecure123!",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password cannot contain the first part of your email address."
    );
  });

  it("rejects a password containing the first name", () => {
    const result = validatePassword({
      ...validInput,
      email: "user@example.com",
      password: "HelloEricka123!",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password cannot contain your first name."
    );
  });

  it("rejects a password containing the last name", () => {
    const result = validatePassword({
      ...validInput,
      email: "user@example.com",
      password: "SecureJames123!",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password cannot contain your last name."
    );
  });

  it("checks rules case-insensitively", () => {
    const result = validatePassword({
      ...validInput,
      username: "PatchUser",
      password: "safepatchuser123!",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password cannot contain your username."
    );
  });

  it("returns multiple errors when multiple rules fail", () => {
    const result = validatePassword({
      password: "ericka",
      email: "ericka@example.com",
      username: "ericka",
      firstName: "Ericka",
      lastName: "James",
    });

    expect(result.isValid).toBe(false);

    expect(result.errors).toContain(
      "Password must be at least 9 characters long."
    );

    expect(result.errors).toContain(
      "Password cannot contain your username."
    );

    expect(result.errors).toContain(
      "Password cannot contain the first part of your email address."
    );

    expect(result.errors).toContain(
      "Password cannot contain your first name."
    );
  });

  it("does not fail on empty optional comparison values", () => {
    const result = validatePassword({
      password: "S3cure!Pass",
      email: "",
      username: "",
      firstName: "",
      lastName: "",
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});