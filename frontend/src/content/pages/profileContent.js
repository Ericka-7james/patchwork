export const PROFILE_CONTENT = {
  intro: {
    eyebrow: "Your profile",
    heading: "Your resume at a glance",
    description:
      "Review the information PatchWork extracted from your current resume.",
  },

  filename: {
    label: "Current resume",
  },

  sections: {
    skills: {
      heading: "Skills",
      emptyMessage: "No skills were found in this resume.",
    },

    education: {
      heading: "Education",
      emptyMessage: "No education details were found in this resume.",
    },

    experience: {
      heading: "Work Experience",
      emptyMessage: "No work experience was found in this resume.",
    },
  },

  loading: {
    message: "Loading your resume profile...",
  },

  errors: {
    loadFallback: "Unable to load your resume. Please try again.",
    logoutFallback: "Unable to log out. Please try again.",
  },
  routes: {
    login: "/login",
    dashboard: "/dashboard",
  },
};
