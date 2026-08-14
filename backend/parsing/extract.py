import re
import unicodedata

from backend.parsing.extractors.docx import (
    DocxExtractionError,
    extract_docx_text,
)
from backend.parsing.extractors.pdf import (
    PdfExtractionError,
    extract_pdf_text,
)

PDF_MIME_TYPE = "application/pdf"

DOCX_MIME_TYPE = (
    "application/vnd.openxmlformats-officedocument."
    "wordprocessingml.document"
)

ZERO_WIDTH_SEPARATORS = re.compile(
    r"[\u200b]"
)

INVISIBLE_FORMATTING_CHARACTERS = re.compile(
    r"[\u200c\u200d\u2060\ufeff]"
)


class UnsupportedResumeTypeError(Exception):
    """Raised when the resume MIME type is not supported."""


def normalize_extracted_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text)

    text = text.replace("\xa0", " ")

    text = ZERO_WIDTH_SEPARATORS.sub(" ", text)

    text = INVISIBLE_FORMATTING_CHARACTERS.sub("", text)

    normalized_lines = []

    for line in text.splitlines():
        cleaned_line = re.sub(
            r"[ \t]+",
            " ",
            line,
        ).strip()

        if cleaned_line:
            normalized_lines.append(cleaned_line)

    return "\n".join(normalized_lines)


def extract_resume_text(
    file_bytes: bytes,
    mime_type: str,
) -> str:
    if mime_type == PDF_MIME_TYPE:
        extracted_text = extract_pdf_text(file_bytes)
    elif mime_type == DOCX_MIME_TYPE:
        extracted_text = extract_docx_text(file_bytes)
    else:
        raise UnsupportedResumeTypeError(
            "Only PDF and DOCX resumes are supported."
        )

    return normalize_extracted_text(extracted_text)


__all__ = [
    "DOCX_MIME_TYPE",
    "PDF_MIME_TYPE",
    "DocxExtractionError",
    "PdfExtractionError",
    "UnsupportedResumeTypeError",
    "extract_resume_text",
    "normalize_extracted_text",
]