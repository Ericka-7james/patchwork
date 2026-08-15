from unittest.mock import MagicMock, patch

import pymupdf
import pytest
from pypdf.errors import PdfReadError

from parsing.extractors.pdf import (
    PdfExtractionError,
    extract_pdf_text,
)


def test_extract_pdf_text_uses_pymupdf_first():
    first_page = MagicMock()
    first_page.get_text.return_value = (
        "Ericka James\nSoftware Engineer"
    )

    second_page = MagicMock()
    second_page.get_text.return_value = (
        "Python\nReact\nAWS"
    )

    document = MagicMock()
    document.__iter__.return_value = [
        first_page,
        second_page,
    ]

    with patch(
        "parsing.extractors.pdf.pymupdf.open",
        return_value=document,
    ):
        text = extract_pdf_text(
            b"%PDF-test"
        )

    assert text == (
        "Ericka James\n"
        "Software Engineer"
        "\n\n"
        "Python\n"
        "React\n"
        "AWS"
    )

    first_page.get_text.assert_called_once_with(
        "text",
        sort=True,
    )

    second_page.get_text.assert_called_once_with(
        "text",
        sort=True,
    )

    document.close.assert_called_once()


def test_extract_pdf_text_skips_empty_pages():
    empty_page = MagicMock()
    empty_page.get_text.return_value = ""

    text_page = MagicMock()
    text_page.get_text.return_value = (
        "Experience"
    )

    document = MagicMock()
    document.__iter__.return_value = [
        empty_page,
        text_page,
    ]

    with patch(
        "parsing.extractors.pdf.pymupdf.open",
        return_value=document,
    ):
        text = extract_pdf_text(
            b"%PDF-test"
        )

    assert text == "Experience"


def test_extract_pdf_text_falls_back_to_pypdf():
    page = MagicMock()
    page.extract_text.return_value = (
        "Fallback resume text"
    )

    reader = MagicMock()
    reader.pages = [
        page
    ]

    with (
        patch(
            "parsing.extractors.pdf.pymupdf.open",
            side_effect=pymupdf.FileDataError(
                "PyMuPDF failed"
            ),
        ),
        patch(
            "parsing.extractors.pdf.PdfReader",
            return_value=reader,
        ),
    ):
        text = extract_pdf_text(
            b"%PDF-test"
        )

    assert text == (
        "Fallback resume text"
    )

    page.extract_text.assert_called_once_with(
        extraction_mode="layout",
    )


def test_extract_pdf_text_falls_back_when_primary_returns_no_text():
    empty_page = MagicMock()
    empty_page.get_text.return_value = ""

    document = MagicMock()
    document.__iter__.return_value = [
        empty_page
    ]

    fallback_page = MagicMock()
    fallback_page.extract_text.return_value = (
        "Fallback text"
    )

    reader = MagicMock()
    reader.pages = [
        fallback_page
    ]

    with (
        patch(
            "parsing.extractors.pdf.pymupdf.open",
            return_value=document,
        ),
        patch(
            "parsing.extractors.pdf.PdfReader",
            return_value=reader,
        ),
    ):
        text = extract_pdf_text(
            b"%PDF-test"
        )

    assert text == "Fallback text"


def test_extract_pdf_text_rejects_empty_file():
    with pytest.raises(
        PdfExtractionError,
        match="PDF file is empty",
    ):
        extract_pdf_text(
            b""
        )


def test_extract_pdf_text_rejects_malformed_pdf():
    with (
        patch(
            "parsing.extractors.pdf.pymupdf.open",
            side_effect=pymupdf.FileDataError(
                "broken PDF"
            ),
        ),
        patch(
            "parsing.extractors.pdf.PdfReader",
            side_effect=PdfReadError(
                "broken PDF"
            ),
        ),
    ):
        with pytest.raises(
            PdfExtractionError,
            match="PDF text could not be extracted",
        ):
            extract_pdf_text(
                b"broken"
            )


def test_extract_pdf_text_rejects_pdf_without_selectable_text():
    primary_page = MagicMock()
    primary_page.get_text.return_value = ""

    document = MagicMock()
    document.__iter__.return_value = [
        primary_page
    ]

    fallback_page = MagicMock()
    fallback_page.extract_text.return_value = None

    reader = MagicMock()
    reader.pages = [
        fallback_page
    ]

    with (
        patch(
            "parsing.extractors.pdf.pymupdf.open",
            return_value=document,
        ),
        patch(
            "parsing.extractors.pdf.PdfReader",
            return_value=reader,
        ),
    ):
        with pytest.raises(
            PdfExtractionError,
            match="No selectable text",
        ):
            extract_pdf_text(
                b"%PDF-image-only"
            )


def test_extract_pdf_text_wraps_backend_failures():
    primary_page = MagicMock()
    primary_page.get_text.side_effect = (
        RuntimeError(
            "primary extraction failed"
        )
    )

    document = MagicMock()
    document.__iter__.return_value = [
        primary_page
    ]

    fallback_page = MagicMock()
    fallback_page.extract_text.side_effect = (
        RuntimeError(
            "fallback extraction failed"
        )
    )

    reader = MagicMock()
    reader.pages = [
        fallback_page
    ]

    with (
        patch(
            "parsing.extractors.pdf.pymupdf.open",
            return_value=document,
        ),
        patch(
            "parsing.extractors.pdf.PdfReader",
            return_value=reader,
        ),
    ):
        with pytest.raises(
            PdfExtractionError,
            match="PDF text could not be extracted",
        ):
            extract_pdf_text(
                b"%PDF-test"
            )