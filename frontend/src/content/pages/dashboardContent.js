export const DASHBOARD_CONTENT = {
  intro: {
    eyebrow: "Your workspace",
    loadingGreeting: "Welcome back!",
    description:
      "Upload your current resume and PatchWork will help you review, organize, and strengthen how your experience is presented.",
  },

  upload: {
    eyebrow: "Resume upload",
    heading: "Start with your current resume",
    description:
      "Upload the resume you want to improve. You will review everything PatchWork extracts before any updated resume is created.",
    placeholderTitle: "Upload your resume",
    acceptedFormats: "PDF or DOCX, up to 10 MB",
    buttonLabel: "Choose resume",
    selectedLabel: "Selected resume",
    changeButtonLabel: "Choose a different resume",
    uploadButtonLabel: "Upload resume",
    uploadingButtonLabel: "Uploading...",
    successMessage: "Resume uploaded successfully.",
  },

  errors: {
    logoutFallback: "Unable to log out. Please try again.",
    unsupportedResumeType: "Please choose a PDF or DOCX resume.",
    resumeTooLarge: "Your resume must be 10 MB or smaller.",
    uploadFallback: "Unable to upload your resume. Please try again.",
  },

  routes: {
    login: "/login",
  },
};
