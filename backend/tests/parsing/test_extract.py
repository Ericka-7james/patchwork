from unittest.mock import patch

import pytest

from backend.parsing.extract import (
    DOCX_MIME_TYPE,
    PDF_MIME_TYPE,
    UnsupportedResumeTypeError,
    extract_resume_text,
    normalize_extracted_text,
)


def test_normalize_extracted_text_removes_blank_lines():
    text = (
        "Ericka James\n"
        "\n"
        "Software Engineer\n"
        "\n"
        "\n"
        "Python"
    )

    assert normalize_extracted_text(text) == (
        "Ericka James\n"
        "Software Engineer\n"
        "Python"
    )


def test_normalize_extracted_text_collapses_spaces_and_tabs():
    text = (
        "Software     Engineer\n"
        "Python\t\tReact"
    )

    assert normalize_extracted_text(text) == (
        "Software Engineer\n"
        "Python React"
    )


def test_extract_resume_text_routes_pdf():
    with patch(
        "backend.parsing.extract.extract_pdf_text",
        return_value="Resume text",
    ) as extract_pdf_mock:
        result = extract_resume_text(
            file_bytes=b"pdf",
            mime_type=PDF_MIME_TYPE,
        )

    extract_pdf_mock.assert_called_once_with(b"pdf")
    assert result == "Resume text"


def test_extract_resume_text_routes_docx():
    with patch(
        "backend.parsing.extract.extract_docx_text",
        return_value="Resume text",
    ) as extract_docx_mock:
        result = extract_resume_text(
            file_bytes=b"docx",
            mime_type=DOCX_MIME_TYPE,
        )

    extract_docx_mock.assert_called_once_with(b"docx")
    assert result == "Resume text"


def test_extract_resume_text_normalizes_extracted_content():
    with patch(
        "backend.parsing.extract.extract_pdf_text",
        return_value="Python     React\n\nAWS",
    ):
        result = extract_resume_text(
            file_bytes=b"pdf",
            mime_type=PDF_MIME_TYPE,
        )

    assert result == "Python React\nAWS"


def test_extract_resume_text_rejects_unsupported_mime_type():
    with pytest.raises(
        UnsupportedResumeTypeError,
        match="Only PDF and DOCX resumes are supported",
    ):
        extract_resume_text(
            file_bytes=b"resume",
            mime_type="text/plain",
        )

def test_normalize_extracted_text_converts_zero_width_space():
    text = (
        "technical\u200band\n"
        "Google\u200bWorkspace\n"
        "modules,\u200bLEDs"
    )

    assert normalize_extracted_text(text) == (
        "technical and\n"
        "Google Workspace\n"
        "modules, LEDs"
    )


def test_normalize_extracted_text_removes_formatting_characters():
    text = (
        "Fast\u2060API\n"
        "Java\u200dScript"
    )

    assert normalize_extracted_text(text) == (
        "FastAPI\n"
        "JavaScript"
    )


def test_normalize_extracted_text_replaces_nonbreaking_spaces():
    text = "Software\xa0Engineer"

    assert normalize_extracted_text(text) == (
        "Software Engineer"
    )