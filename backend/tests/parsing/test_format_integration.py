from unittest.mock import patch

from backend.parsing.extract import (
    DOCX_MIME_TYPE,
    PDF_MIME_TYPE,
    extract_resume_text,
)


def test_extract_resume_text_formats_pdf_visual_wraps():
    extracted_pdf = (
        "PROFESSIONAL SUMMARY\n"
        "Software Engineer with experience in automation, data\n"
        "analysis, process improvement, and operations."
    )

    with patch(
        "backend.parsing.extract.extract_pdf_text",
        return_value=extracted_pdf,
    ):
        text = extract_resume_text(
            b"%PDF-test",
            PDF_MIME_TYPE,
        )

    assert text == (
        "PROFESSIONAL SUMMARY\n"
        "Software Engineer with experience in automation, data "
        "analysis, process improvement, and operations."
    )


def test_extract_resume_text_formats_wrapped_pdf_bullet():
    extracted_pdf = (
        "PROFESSIONAL EXPERIENCE\n"
        "● Built a workflow that reviews product data hourly and\n"
        "updates website content automatically.\n"
        "● Added automated tests."
    )

    with patch(
        "backend.parsing.extract.extract_pdf_text",
        return_value=extracted_pdf,
    ):
        text = extract_resume_text(
            b"%PDF-test",
            PDF_MIME_TYPE,
        )

    assert text == (
        "PROFESSIONAL EXPERIENCE\n"
        "● Built a workflow that reviews product data hourly and "
        "updates website content automatically.\n"
        "● Added automated tests."
    )


def test_extract_resume_text_does_not_apply_pdf_formatter_to_docx():
    extracted_docx = (
        "First paragraph\n"
        "Second paragraph"
    )

    with (
        patch(
            "backend.parsing.extract.extract_docx_text",
            return_value=extracted_docx,
        ),
        patch(
            "backend.parsing.extract.format_pdf_text",
        ) as formatter,
    ):
        text = extract_resume_text(
            b"DOCX-test",
            DOCX_MIME_TYPE,
        )

    assert text == (
        "First paragraph\n"
        "Second paragraph"
    )

    formatter.assert_not_called()