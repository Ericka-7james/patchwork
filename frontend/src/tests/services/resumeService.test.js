import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fromMock,
  tableUpsertMock,
  tableSelectMock,
  selectMock,
  eqMock,
  singleMock,
  storageFromMock,
  storageUploadMock,
  getSessionMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  tableUpsertMock: vi.fn(),
  tableSelectMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  singleMock: vi.fn(),
  storageFromMock: vi.fn(),
  storageUploadMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: fromMock,

    storage: {
      from: storageFromMock,
    },

    auth: {
      getSession: getSessionMock,
    },
  },
}));

import {
  getResumeByUserId,
  updateResumeExperience,
  uploadResume,
} from "../../services/resumeService";

function createPdfResume() {
  return new File(["resume content"], "Ericka_James_Resume.pdf", {
    type: "application/pdf",
  });
}

function createDocxResume() {
  return new File(["resume content"], "Ericka_James_Resume.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function mockSuccessfulDatabaseUpsert({
  resumeId = "resume-123",
  userId = "user-123",
  file = createPdfResume(),
} = {}) {
  const resume = {
    id: resumeId,
    user_id: userId,
    original_filename: file.name,
    mime_type: file.type,
    status: "uploaded",
  };

  singleMock.mockResolvedValue({
    data: resume,
    error: null,
  });

  return resume;
}

function mockSuccessfulStorageUpload() {
  storageUploadMock.mockResolvedValue({
    data: {
      path: "user-123/resume-123/original",
    },
    error: null,
  });
}

function mockAuthenticatedSession() {
  getSessionMock.mockResolvedValue({
    data: {
      session: {
        access_token: "test-access-token",
      },
    },
    error: null,
  });
}

function mockSuccessfulParse() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,

      json: vi.fn().mockResolvedValue({
        resume_id: "resume-123",
        status: "parsed",

        parsed_data: {
          name: "Ericka James",

          skills: {
            Languages: ["Python", "Java"],
          },
        },
      }),
    })
  );
}

function mockSuccessfulExperienceUpdate() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,

      json: vi.fn().mockResolvedValue({
        resume_id: "resume-123",

        experience_index: 0,

        experience: {
          heading: "Example Company — Senior Software Engineer",

          bullets: ["Built production software.", "Added automated testing."],

          hidden: true,
        },

        parsed_data: {
          name: "Ericka James",

          experience: [
            {
              heading: "Example Company — Senior Software Engineer",

              bullets: [
                "Built production software.",
                "Added automated testing.",
              ],

              hidden: true,
            },
          ],
        },
      }),
    })
  );
}

describe("resumeService", () => {
  beforeEach(() => {
    fromMock.mockReset();
    tableUpsertMock.mockReset();
    tableSelectMock.mockReset();
    selectMock.mockReset();
    eqMock.mockReset();
    singleMock.mockReset();

    storageFromMock.mockReset();
    storageUploadMock.mockReset();

    getSessionMock.mockReset();

    vi.unstubAllGlobals();

    fromMock.mockReturnValue({
      upsert: tableUpsertMock,
      select: tableSelectMock,
    });

    tableUpsertMock.mockReturnValue({
      select: selectMock,
    });

    selectMock.mockReturnValue({
      single: singleMock,
    });

    tableSelectMock.mockReturnValue({
      eq: eqMock,
    });

    eqMock.mockReturnValue({
      single: singleMock,
    });

    storageFromMock.mockReturnValue({
      upload: storageUploadMock,
    });
  });

  describe("getResumeByUserId", () => {
    it("rejects when no authenticated user id is provided", async () => {
      await expect(getResumeByUserId("")).rejects.toThrow(
        "You must be signed in to view your resume."
      );

      expect(fromMock).not.toHaveBeenCalled();
    });

    it("loads the authenticated user's parsed resume", async () => {
      const resume = {
        id: "resume-123",
        user_id: "user-123",
        original_filename: "Ericka_James_Resume.pdf",
        status: "parsed",

        parsed_data: {
          education: ["Spelman College — B.S. Computer Science, 2025"],

          experience: [
            {
              heading: "Example Company — Software Engineer",

              bullets: ["Built internal tools.", "Added automated tests."],

              hidden: false,
            },
          ],

          skills: {
            Languages: ["Python", "Java"],

            Cloud: ["AWS", "Terraform"],
          },
        },
      };

      singleMock.mockResolvedValue({
        data: resume,
        error: null,
      });

      const result = await getResumeByUserId("user-123");

      expect(fromMock).toHaveBeenCalledWith("resumes");

      expect(tableSelectMock).toHaveBeenCalledWith(
        "id, user_id, original_filename, status, parsed_data"
      );

      expect(eqMock).toHaveBeenCalledWith("user_id", "user-123");

      expect(result).toEqual(resume);
    });

    it("throws the database error when the resume cannot be loaded", async () => {
      singleMock.mockResolvedValue({
        data: null,

        error: {
          message: "Resume lookup failed",
        },
      });

      await expect(getResumeByUserId("user-123")).rejects.toThrow(
        "Resume lookup failed"
      );
    });

    it("uses the resume lookup fallback error", async () => {
      singleMock.mockResolvedValue({
        data: null,
        error: {},
      });

      await expect(getResumeByUserId("user-123")).rejects.toThrow(
        "Unable to load your resume."
      );
    });
  });

  describe("updateResumeExperience", () => {
    it("updates an experience through the backend", async () => {
      mockAuthenticatedSession();
      mockSuccessfulExperienceUpdate();

      const result = await updateResumeExperience({
        resumeId: "resume-123",

        experienceIndex: 0,

        experience: {
          heading: "Example Company — Senior Software Engineer",

          bullets: ["Built production software.", "Added automated testing."],

          hidden: true,
        },
      });

      expect(getSessionMock).toHaveBeenCalledOnce();

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/resumes/resume-123/experience/0",
        {
          method: "PATCH",

          headers: {
            Authorization: "Bearer test-access-token",

            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            heading: "Example Company — Senior Software Engineer",

            bullets: ["Built production software.", "Added automated testing."],

            hidden: true,
          }),
        }
      );

      expect(result.experience).toEqual({
        heading: "Example Company — Senior Software Engineer",

        bullets: ["Built production software.", "Added automated testing."],

        hidden: true,
      });

      expect(result.parsed_data.experience[0].hidden).toBe(true);
    });

    it("sends hidden false when experience is visible", async () => {
      mockAuthenticatedSession();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,

          json: vi.fn().mockResolvedValue({
            resume_id: "resume-123",

            experience_index: 1,

            experience: {
              heading: "Visible Company — Engineer",

              bullets: ["Built software."],

              hidden: false,
            },

            parsed_data: {
              experience: [
                {
                  heading: "Visible Company — Engineer",

                  bullets: ["Built software."],

                  hidden: false,
                },
              ],
            },
          }),
        })
      );

      await updateResumeExperience({
        resumeId: "resume-123",

        experienceIndex: 1,

        experience: {
          heading: "Visible Company — Engineer",

          bullets: ["Built software."],

          hidden: false,
        },
      });

      const request = fetch.mock.calls[0][1];

      expect(JSON.parse(request.body)).toEqual({
        heading: "Visible Company — Engineer",

        bullets: ["Built software."],

        hidden: false,
      });
    });

    it("defaults missing bullets to an empty array", async () => {
      mockAuthenticatedSession();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,

          json: vi.fn().mockResolvedValue({
            resume_id: "resume-123",

            experience_index: 0,

            experience: {
              heading: "Example Company",

              bullets: [],

              hidden: false,
            },

            parsed_data: {
              experience: [
                {
                  heading: "Example Company",

                  bullets: [],

                  hidden: false,
                },
              ],
            },
          }),
        })
      );

      await updateResumeExperience({
        resumeId: "resume-123",

        experienceIndex: 0,

        experience: {
          heading: "Example Company",
        },
      });

      const request = fetch.mock.calls[0][1];

      expect(JSON.parse(request.body)).toEqual({
        heading: "Example Company",

        bullets: [],

        hidden: false,
      });
    });

    it("rejects when the resume id is missing", async () => {
      await expect(
        updateResumeExperience({
          resumeId: "",

          experienceIndex: 0,

          experience: {
            heading: "Example Company",
          },
        })
      ).rejects.toThrow("Resume information is missing.");

      expect(getSessionMock).not.toHaveBeenCalled();
    });

    it("rejects when the experience index is invalid", async () => {
      await expect(
        updateResumeExperience({
          resumeId: "resume-123",

          experienceIndex: -1,

          experience: {
            heading: "Example Company",
          },
        })
      ).rejects.toThrow("Experience information is missing.");

      expect(getSessionMock).not.toHaveBeenCalled();
    });

    it("requires an authenticated session to update experience", async () => {
      getSessionMock.mockResolvedValue({
        data: {
          session: null,
        },

        error: null,
      });

      await expect(
        updateResumeExperience({
          resumeId: "resume-123",

          experienceIndex: 0,

          experience: {
            heading: "Example Company",
            bullets: [],
            hidden: false,
          },
        })
      ).rejects.toThrow("You must be signed in to update your resume.");
    });

    it("throws the backend experience update error", async () => {
      mockAuthenticatedSession();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,

          json: vi.fn().mockResolvedValue({
            detail: "Experience not found.",
          }),
        })
      );

      await expect(
        updateResumeExperience({
          resumeId: "resume-123",

          experienceIndex: 99,

          experience: {
            heading: "Example Company",
            bullets: [],
            hidden: false,
          },
        })
      ).rejects.toThrow("Experience not found.");
    });

    it("uses the update fallback error when the backend returns no JSON", async () => {
      mockAuthenticatedSession();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,

          json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
        })
      );

      await expect(
        updateResumeExperience({
          resumeId: "resume-123",

          experienceIndex: 0,

          experience: {
            heading: "Example Company",
            bullets: [],
            hidden: false,
          },
        })
      ).rejects.toThrow("Unable to save experience changes.");
    });
  });

  describe("uploadResume", () => {
    it("rejects when no authenticated user id is provided", async () => {
      const file = createPdfResume();

      await expect(
        uploadResume({
          userId: "",
          file,
        })
      ).rejects.toThrow("You must be signed in to upload a resume.");

      expect(fromMock).not.toHaveBeenCalled();

      expect(storageFromMock).not.toHaveBeenCalled();
    });

    it("rejects when no resume file is provided", async () => {
      await expect(
        uploadResume({
          userId: "user-123",
          file: null,
        })
      ).rejects.toThrow("Please choose a resume to upload.");

      expect(fromMock).not.toHaveBeenCalled();

      expect(storageFromMock).not.toHaveBeenCalled();
    });

    it("uploads and parses a PDF resume", async () => {
      const file = createPdfResume();

      mockSuccessfulDatabaseUpsert({
        file,
      });

      mockSuccessfulStorageUpload();
      mockAuthenticatedSession();
      mockSuccessfulParse();

      const result = await uploadResume({
        userId: "user-123",
        file,
      });

      expect(fromMock).toHaveBeenCalledWith("resumes");

      expect(tableUpsertMock).toHaveBeenCalledWith(
        {
          user_id: "user-123",

          original_filename: "Ericka_James_Resume.pdf",

          mime_type: "application/pdf",

          status: "uploaded",

          parsed_data: null,

          parse_error: null,
        },
        {
          onConflict: "user_id",
        }
      );

      expect(storageUploadMock).toHaveBeenCalledWith(
        "user-123/resume-123/original",
        file,
        {
          contentType: "application/pdf",

          upsert: true,
        }
      );

      expect(getSessionMock).toHaveBeenCalledOnce();

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/resumes/resume-123/parse",
        {
          method: "POST",

          headers: {
            Authorization: "Bearer test-access-token",
          },
        }
      );

      expect(result).toEqual({
        id: "resume-123",

        user_id: "user-123",

        original_filename: "Ericka_James_Resume.pdf",

        mime_type: "application/pdf",

        status: "parsed",

        parsed_data: {
          name: "Ericka James",

          skills: {
            Languages: ["Python", "Java"],
          },
        },
      });
    });

    it("uploads a DOCX using the same deterministic storage path", async () => {
      const file = createDocxResume();

      mockSuccessfulDatabaseUpsert({
        file,
      });

      mockSuccessfulStorageUpload();
      mockAuthenticatedSession();
      mockSuccessfulParse();

      await uploadResume({
        userId: "user-123",
        file,
      });

      expect(storageUploadMock).toHaveBeenCalledWith(
        "user-123/resume-123/original",
        file,
        {
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

          upsert: true,
        }
      );
    });

    it("clears previous parsed data when replacing a resume", async () => {
      const file = createPdfResume();

      mockSuccessfulDatabaseUpsert({
        file,
      });

      mockSuccessfulStorageUpload();
      mockAuthenticatedSession();
      mockSuccessfulParse();

      await uploadResume({
        userId: "user-123",
        file,
      });

      expect(tableUpsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "uploaded",

          parsed_data: null,

          parse_error: null,
        }),
        {
          onConflict: "user_id",
        }
      );
    });

    it("does not upload when the database upsert fails", async () => {
      singleMock.mockResolvedValue({
        data: null,

        error: {
          message: "Database upsert failed",
        },
      });

      const file = createPdfResume();

      await expect(
        uploadResume({
          userId: "user-123",
          file,
        })
      ).rejects.toThrow("Database upsert failed");

      expect(storageUploadMock).not.toHaveBeenCalled();

      expect(getSessionMock).not.toHaveBeenCalled();
    });

    it("uses the database fallback error", async () => {
      singleMock.mockResolvedValue({
        data: null,
        error: {},
      });

      await expect(
        uploadResume({
          userId: "user-123",
          file: createPdfResume(),
        })
      ).rejects.toThrow("Unable to save resume details.");
    });

    it("does not parse when Storage upload fails", async () => {
      mockSuccessfulDatabaseUpsert();

      storageUploadMock.mockResolvedValue({
        data: null,

        error: {
          message: "Storage upload failed",
        },
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch");

      await expect(
        uploadResume({
          userId: "user-123",
          file: createPdfResume(),
        })
      ).rejects.toThrow("Storage upload failed");

      expect(getSessionMock).not.toHaveBeenCalled();

      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it("uses the Storage fallback error", async () => {
      mockSuccessfulDatabaseUpsert();

      storageUploadMock.mockResolvedValue({
        data: null,
        error: {},
      });

      await expect(
        uploadResume({
          userId: "user-123",
          file: createPdfResume(),
        })
      ).rejects.toThrow("Unable to upload your resume.");
    });

    it("rejects when the Supabase session is missing", async () => {
      mockSuccessfulDatabaseUpsert();
      mockSuccessfulStorageUpload();

      getSessionMock.mockResolvedValue({
        data: {
          session: null,
        },

        error: null,
      });

      await expect(
        uploadResume({
          userId: "user-123",
          file: createPdfResume(),
        })
      ).rejects.toThrow("You must be signed in to update your resume.");
    });

    it("throws the session error", async () => {
      mockSuccessfulDatabaseUpsert();
      mockSuccessfulStorageUpload();

      getSessionMock.mockResolvedValue({
        data: {
          session: null,
        },

        error: {
          message: "Session failed",
        },
      });

      await expect(
        uploadResume({
          userId: "user-123",
          file: createPdfResume(),
        })
      ).rejects.toThrow("Session failed");
    });

    it("throws the backend parse error", async () => {
      mockSuccessfulDatabaseUpsert();
      mockSuccessfulStorageUpload();
      mockAuthenticatedSession();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,

          json: vi.fn().mockResolvedValue({
            detail: "Unable to parse resume.",
          }),
        })
      );

      await expect(
        uploadResume({
          userId: "user-123",
          file: createPdfResume(),
        })
      ).rejects.toThrow("Unable to parse resume.");
    });

    it("uses the parse fallback error when the backend returns no JSON", async () => {
      mockSuccessfulDatabaseUpsert();
      mockSuccessfulStorageUpload();
      mockAuthenticatedSession();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,

          json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
        })
      );

      await expect(
        uploadResume({
          userId: "user-123",
          file: createPdfResume(),
        })
      ).rejects.toThrow("Unable to parse your resume.");
    });
  });
});
