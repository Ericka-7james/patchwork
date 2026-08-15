export const RESUME_GENERATOR_CONTENT = {
  intro: {
    eyebrow: "Resume builder",
    heading: "Your Harvard-style resume",
    description:
      "Preview a clean, professional resume generated from your existing resume information.",
  },

  template: {
    name: "Harvard",
    description:
      "A traditional, ATS-friendly resume format with clear hierarchy and focused spacing.",
  },

  actions: {
    downloadPdf: "Download PDF",
    downloadingPdf: "Preparing PDF...",
    backToProfile: "Back to profile",
  },

  loading: {
    message: "Preparing your resume preview...",
  },

  errors: {
    loadFallback: "Unable to load your resume. Please try again.",
    missingResume:
      "No parsed resume data is available yet. Upload and process a resume first.",
    downloadFallback: "Unable to create your PDF. Please try again.",
    logoutFallback: "Unable to log out. Please try again.",
  },

  document: {
    sections: {
      summary: "Summary",
      education: "Education",
      experience: "Experience",
      projects: "Projects",
      skills: "Skills",
      certifications: "Certifications",
      coreCompetencies: "Core Competencies",
    },
  },

  routes: {
    login: "/login",
    profile: "/profile",
    dashboard: "/dashboard",
  },
};
