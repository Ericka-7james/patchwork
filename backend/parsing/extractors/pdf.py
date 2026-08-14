from io import BytesIO

import pymupdf
from pypdf import PdfReader
from pypdf.errors import PdfReadError


class PdfExtractionError(Exception):
    """Raised when usable text cannot be extracted from a PDF."""


class _PdfBackendError(Exception):
    """Raised when an individual PDF extraction backend fails."""


def _extract_with_pymupdf(file_bytes: bytes) -> str:
    document = None

    try:
        document = pymupdf.open(
            stream=file_bytes,
            filetype="pdf",
        )

        page_text: list[str] = []

        for page in document:
            text = page.get_text(
                "text",
                sort=True,
            ) or ""

            if text.strip():
                page_text.append(
                    text.strip()
                )

        return "\n\n".join(
            page_text
        ).strip()

    except (
        pymupdf.FileDataError,
        pymupdf.EmptyFileError,
        RuntimeError,
        ValueError,
    ) as error:
        raise _PdfBackendError(
            "PyMuPDF could not read the PDF."
        ) from error

    except Exception as error:
        raise _PdfBackendError(
            "PyMuPDF could not extract PDF text."
        ) from error

    finally:
        if document is not None:
            document.close()


def _extract_with_pypdf(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(
            BytesIO(
                file_bytes
            )
        )

    except (
        PdfReadError,
        ValueError,
        TypeError,
    ) as error:
        raise _PdfBackendError(
            "pypdf could not read the PDF."
        ) from error

    page_text: list[str] = []

    try:
        for page in reader.pages:
            text = (
                page.extract_text(
                    extraction_mode="layout",
                )
                or ""
            )

            if text.strip():
                page_text.append(
                    text.strip()
                )

    except Exception as error:
        raise _PdfBackendError(
            "pypdf could not extract PDF text."
        ) from error

    return "\n\n".join(
        page_text
    ).strip()


def extract_pdf_text(
    file_bytes: bytes,
) -> str:
    if not file_bytes:
        raise PdfExtractionError(
            "The PDF file is empty."
        )

    backend_errors = []

    try:
        extracted_text = (
            _extract_with_pymupdf(
                file_bytes
            )
        )

        if extracted_text:
            return extracted_text

    except _PdfBackendError as error:
        backend_errors.append(
            error
        )

    try:
        extracted_text = (
            _extract_with_pypdf(
                file_bytes
            )
        )

        if extracted_text:
            return extracted_text

    except _PdfBackendError as error:
        backend_errors.append(
            error
        )

    if len(backend_errors) == 2:
        raise PdfExtractionError(
            "The PDF text could not be extracted."
        ) from backend_errors[-1]

    raise PdfExtractionError(
        "No selectable text was found in this PDF. "
        "Scanned or image-only PDFs are not supported yet."
    )