export function validatePassword({
  password,
  email,
  username,
  firstName,
  lastName,
}) {
  const errors = [];

  const normalizedPassword = password.toLowerCase();
  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username.toLowerCase();
  const normalizedFirstName = firstName.toLowerCase();
  const normalizedLastName = lastName.toLowerCase();

  const emailLocalPart = normalizedEmail.split("@")[0];

  if (password.length < 9) {
    errors.push("Password must be at least 9 characters long.");
  }

  if (normalizedPassword === normalizedEmail) {
    errors.push("Password cannot be the same as your email address.");
  }

  if (normalizedUsername && normalizedPassword.includes(normalizedUsername)) {
    errors.push("Password cannot contain your username.");
  }

  if (emailLocalPart && normalizedPassword.includes(emailLocalPart)) {
    errors.push(
      "Password cannot contain the first part of your email address."
    );
  }

  if (normalizedFirstName && normalizedPassword.includes(normalizedFirstName)) {
    errors.push("Password cannot contain your first name.");
  }

  if (normalizedLastName && normalizedPassword.includes(normalizedLastName)) {
    errors.push("Password cannot contain your last name.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
