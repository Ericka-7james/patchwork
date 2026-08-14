from io import BytesIO
from unicodedata import category
from zipfile import BadZipFile

from docx import Document
from docx.opc.exceptions import PackageNotFoundError
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph


class DocxExtractionError(Exception):
    """Raised when usable text cannot be extracted from a DOCX."""


def _get_paragraph_numbering(paragraph: Paragraph):
    paragraph_properties = paragraph._p.pPr

    if (
        paragraph_properties is not None
        and paragraph_properties.numPr is not None
    ):
        return paragraph_properties.numPr

    style = paragraph.style
    visited_styles = set()

    while style is not None:
        style_id = style.style_id

        if style_id in visited_styles:
            break

        visited_styles.add(style_id)

        style_properties = style._element.pPr

        if (
            style_properties is not None
            and style_properties.numPr is not None
        ):
            return style_properties.numPr

        style = style.base_style

    return None


def _normalize_bullet_marker(marker: str | None) -> str | None:
    if not marker:
        return "•"

    if any(category(character) == "Co" for character in marker):
        return "•"

    return marker


def _get_bullet_marker(
    document,
    paragraph: Paragraph,
) -> str | None:
    numbering_properties = _get_paragraph_numbering(paragraph)

    if (
        numbering_properties is None
        or numbering_properties.numId is None
    ):
        return None

    numbering_id = str(numbering_properties.numId.val)

    if numbering_properties.ilvl is not None:
        level_id = str(numbering_properties.ilvl.val)
    else:
        level_id = "0"

    numbering = document.part.numbering_part.element

    abstract_numbering_id = None

    for numbering_instance in numbering.findall(qn("w:num")):
        current_id = numbering_instance.get(qn("w:numId"))

        if current_id != numbering_id:
            continue

        abstract_numbering = numbering_instance.find(
            qn("w:abstractNumId")
        )

        if abstract_numbering is not None:
            abstract_numbering_id = abstract_numbering.get(
                qn("w:val")
            )

        break

    if abstract_numbering_id is None:
        return None

    for abstract_numbering in numbering.findall(
        qn("w:abstractNum")
    ):
        current_id = abstract_numbering.get(
            qn("w:abstractNumId")
        )

        if current_id != abstract_numbering_id:
            continue

        for level in abstract_numbering.findall(qn("w:lvl")):
            current_level = level.get(qn("w:ilvl"))

            if current_level != level_id:
                continue

            number_format = level.find(qn("w:numFmt"))

            if (
                number_format is None
                or number_format.get(qn("w:val")) != "bullet"
            ):
                return None

            level_text = level.find(qn("w:lvlText"))

            marker = (
                level_text.get(qn("w:val"))
                if level_text is not None
                else None
            )

            return _normalize_bullet_marker(marker)

    return None


def _extract_paragraph_text(
    document,
    paragraph: Paragraph,
) -> str:
    text = paragraph.text.strip()

    if not text:
        return ""

    bullet_marker = _get_bullet_marker(
        document=document,
        paragraph=paragraph,
    )

    if bullet_marker:
        return f"{bullet_marker} {text}"

    return text


def _extract_table_text(table: Table) -> list[str]:
    extracted_rows: list[str] = []

    for row in table.rows:
        cells: list[str] = []
        seen_cells = set()

        for cell in row.cells:
            cell_identity = id(cell._tc)

            if cell_identity in seen_cells:
                continue

            seen_cells.add(cell_identity)

            cell_text = " ".join(
                paragraph.text.strip()
                for paragraph in cell.paragraphs
                if paragraph.text.strip()
            )

            if cell_text:
                cells.append(cell_text)

        if cells:
            extracted_rows.append(" | ".join(cells))

    return extracted_rows


def extract_docx_text(file_bytes: bytes) -> str:
    if not file_bytes:
        raise DocxExtractionError("The DOCX file is empty.")

    try:
        document = Document(BytesIO(file_bytes))
    except (
        BadZipFile,
        PackageNotFoundError,
        ValueError,
        TypeError,
    ) as error:
        raise DocxExtractionError(
            "The DOCX file could not be read."
        ) from error

    extracted_content: list[str] = []

    try:
        for block in document.iter_inner_content():
            if isinstance(block, Paragraph):
                text = _extract_paragraph_text(
                    document=document,
                    paragraph=block,
                )

                if text:
                    extracted_content.append(text)

            elif isinstance(block, Table):
                extracted_content.extend(
                    _extract_table_text(block)
                )
    except Exception as error:
        raise DocxExtractionError(
            "The DOCX text could not be extracted."
        ) from error

    extracted_text = "\n".join(
        extracted_content
    ).strip()

    if not extracted_text:
        raise DocxExtractionError(
            "No usable text was found in this DOCX."
        )

    return extracted_text