import sys
from pathlib import Path

from backend.parsing.extract import (
    DOCX_MIME_TYPE,
    PDF_MIME_TYPE,
    extract_resume_text,
)


def get_mime_type(file_path: Path) -> str:
    suffix = file_path.suffix.lower()

    if suffix == ".pdf":
        return PDF_MIME_TYPE

    if suffix == ".docx":
        return DOCX_MIME_TYPE

    raise ValueError("Only PDF and DOCX files are supported.")


def main():
    if len(sys.argv) != 2:
        print(
            "Usage: python -m backend.scripts.inspect_extraction "
            "<resume-path>"
        )
        raise SystemExit(1)

    file_path = Path(sys.argv[1])

    if not file_path.exists():
        print(f"File not found: {file_path}")
        raise SystemExit(1)

    file_bytes = file_path.read_bytes()
    mime_type = get_mime_type(file_path)

    extracted_text = extract_resume_text(
        file_bytes=file_bytes,
        mime_type=mime_type,
    )

    print("\n===== EXTRACTED TEXT =====\n")
    print(extracted_text)
    print("\n===== END =====\n")


if __name__ == "__main__":
    main()