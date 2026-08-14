import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fromMock,
  tableUpsertMock,
  selectMock,
  singleMock,
  storageFromMock,
  storageUploadMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  tableUpsertMock: vi.fn(),
  selectMock: vi.fn(),
  singleMock: vi.fn(),
  storageFromMock: vi.fn(),
  storageUploadMock: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: fromMock,
    storage: {
      from: storageFromMock,
    },
  },
}));

import { uploadResume } from "../../services/resumeService";

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

describe("uploadResume", () => {
  beforeEach(() => {
    fromMock.mockReset();
    tableUpsertMock.mockReset();
    selectMock.mockReset();
    singleMock.mockReset();
    storageFromMock.mockReset();
    storageUploadMock.mockReset();

    fromMock.mockReturnValue({
      upsert: tableUpsertMock,
    });

    tableUpsertMock.mockReturnValue({
      select: selectMock,
    });

    selectMock.mockReturnValue({
      single: singleMock,
    });

    storageFromMock.mockReturnValue({
      upload: storageUploadMock,
    });
  });

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

  it("upserts resume metadata and uploads a PDF to the user's resume path", async () => {
    const file = createPdfResume();
    const resume = mockSuccessfulDatabaseUpsert({
      file,
    });

    storageUploadMock.mockResolvedValue({
      data: {
        path: "user-123/resume-123/original",
      },
      error: null,
    });

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

    expect(selectMock).toHaveBeenCalledWith(
      "id, user_id, original_filename, mime_type, status"
    );

    expect(singleMock).toHaveBeenCalledOnce();

    expect(storageFromMock).toHaveBeenCalledWith("resume-originals");

    expect(storageUploadMock).toHaveBeenCalledWith(
      "user-123/resume-123/original",
      file,
      {
        contentType: "application/pdf",
        upsert: true,
      }
    );

    expect(result).toEqual(resume);
  });

  it("uploads a DOCX using the same deterministic storage path", async () => {
    const file = createDocxResume();

    mockSuccessfulDatabaseUpsert({
      file,
    });

    storageUploadMock.mockResolvedValue({
      data: {
        path: "user-123/resume-123/original",
      },
      error: null,
    });

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

  it("clears previous parsed data and parse errors when replacing a resume", async () => {
    const file = createPdfResume();

    mockSuccessfulDatabaseUpsert({
      file,
    });

    storageUploadMock.mockResolvedValue({
      data: {
        path: "user-123/resume-123/original",
      },
      error: null,
    });

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

  it("throws the database error and does not upload to Storage", async () => {
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

    expect(storageFromMock).not.toHaveBeenCalled();
    expect(storageUploadMock).not.toHaveBeenCalled();
  });

  it("uses the database fallback error when the database error has no message", async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: {},
    });

    const file = createPdfResume();

    await expect(
      uploadResume({
        userId: "user-123",
        file,
      })
    ).rejects.toThrow("Unable to save resume details.");

    expect(storageUploadMock).not.toHaveBeenCalled();
  });

  it("throws the Storage error when the original resume upload fails", async () => {
    const file = createPdfResume();

    mockSuccessfulDatabaseUpsert({
      file,
    });

    storageUploadMock.mockResolvedValue({
      data: null,
      error: {
        message: "Storage upload failed",
      },
    });

    await expect(
      uploadResume({
        userId: "user-123",
        file,
      })
    ).rejects.toThrow("Storage upload failed");
  });

  it("uses the Storage fallback error when the Storage error has no message", async () => {
    const file = createPdfResume();

    mockSuccessfulDatabaseUpsert({
      file,
    });

    storageUploadMock.mockResolvedValue({
      data: null,
      error: {},
    });

    await expect(
      uploadResume({
        userId: "user-123",
        file,
      })
    ).rejects.toThrow("Unable to upload your resume.");
  });
});
