export const SIGNUP_CONTENT = {
  intro: {
    eyebrow: "Start with what you already have.",
    heading: "Build something stronger",
    headingAccent: "from something real.",
    description:
      "Create your PatchWork account and start improving the way your experience is presented.",

    principle: {
      title: "PatchWork promise",
      description:
        "We improve how your experience is communicated. We do not invent experience for you.",
    },
  },

  card: {
    eyebrow: "Create account",
    heading: "Welcome to PatchWork",
    description:
      "Create your account with email and add the phone number you want associated with your profile.",
  },

  fields: {
    firstName: {
      label: "First name",
      placeholder: "First name",
      autoComplete: "given-name",
    },

    lastName: {
      label: "Last name",
      placeholder: "Last name",
      autoComplete: "family-name",
    },

    username: {
      label: "Username",
      placeholder: "yourusername",
      autoComplete: "username",
      minLength: 3,
    },

    email: {
      label: "Email address",
      placeholder: "you@example.com",
      autoComplete: "email",
    },

    phone: {
      label: "Phone number",
      placeholder: "+15551234567",
      autoComplete: "tel",
    },

    password: {
      label: "Password",
      placeholder: "9+ characters",
      autoComplete: "new-password",
      minLength: 9,
    },

    confirmPassword: {
      label: "Confirm password",
      placeholder: "Enter it again",
      autoComplete: "new-password",
      minLength: 9,
    },
  },

  passwordNote: {
    title: "Your password:",
    description:
      "Must be at least 9 characters and cannot contain your username, email name, first name, or last name.",
  },

  actions: {
    createAccount: "Create account",
    creatingAccount: "Creating account...",
    logIn: "Log in",
  },

  messages: {
    accountCreated:
      "Your account was created. Check your email to confirm your address before signing in.",

    passwordMismatch: "Passwords do not match.",

    validationHeading: "Check a few things:",
  },

  switchText: "Already have an account?",

  routes: {
    login: "/login",
  },
};
