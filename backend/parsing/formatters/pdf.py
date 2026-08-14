import re


BULLET_PATTERN = re.compile(
    r"^\s*(?:[●•▪◦‣⁃■□◆◇]\s*|[-–—]\s+)"
)

SECTION_HEADING_PATTERN = re.compile(
    r"^[A-Z][A-Z0-9 &/+,'().-]{1,60}$"
)

LABELED_LINE_PATTERN = re.compile(
    r"^[A-Za-z][A-Za-z0-9 &/+.-]{0,40}:\s+\S"
)

DATE_RANGE_PATTERN = re.compile(
    r"\b(?:"
    r"Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|"
    r"May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|"
    r"Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
    r")\s+\d{4}\s*[–—-]\s*"
    r"(?:"
    r"Present|"
    r"Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|"
    r"May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|"
    r"Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
    r")?"
    r"(?:\s+\d{4})?"
    r"\b",
    re.IGNORECASE,
)

YEAR_RANGE_PATTERN = re.compile(
    r"\b(?:19|20)\d{2}\s*[–—-]\s*"
    r"(?:Present|(?:19|20)\d{2})\b",
    re.IGNORECASE,
)

DASH_WITH_YEAR_PATTERN = re.compile(
    r"[–—]\s+.*\b(?:19|20)\d{2}\s*$"
)

CONTACT_PATTERN = re.compile(
    r"(?:"
    r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|"
    r"https?://|"
    r"linkedin\.com/|"
    r"\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}"
    r")",
    re.IGNORECASE,
)


def _clean_lines(text: str) -> list[str]:
    return [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]


def _is_bullet(line: str) -> bool:
    return bool(
        BULLET_PATTERN.match(line)
    )


def _is_section_heading(line: str) -> bool:
    if len(line) > 60:
        return False

    if not any(
        character.isalpha()
        for character in line
    ):
        return False

    return bool(
        SECTION_HEADING_PATTERN.fullmatch(
            line
        )
    )


def _is_labeled_line(line: str) -> bool:
    return bool(
        LABELED_LINE_PATTERN.match(
            line
        )
    )


def _has_date_range(line: str) -> bool:
    return bool(
        DATE_RANGE_PATTERN.search(line)
        or YEAR_RANGE_PATTERN.search(line)
    )


def _looks_like_entry_line(line: str) -> bool:
    if _has_date_range(line):
        return True

    return bool(
        DASH_WITH_YEAR_PATTERN.search(
            line
        )
    )


def _is_contact_line(line: str) -> bool:
    return bool(
        CONTACT_PATTERN.search(line)
    )


def _starts_new_logical_block(
    line: str,
) -> bool:
    return any(
        (
            _is_bullet(line),
            _is_section_heading(line),
            _is_labeled_line(line),
            _looks_like_entry_line(line),
            _is_contact_line(line),
        )
    )


def _previous_requires_new_line(
    previous: str,
) -> bool:
    return any(
        (
            _is_section_heading(previous),
            _is_contact_line(previous),
        )
    )


def _join_lines(
    previous: str,
    current: str,
) -> str:
    return (
        f"{previous.rstrip()} "
        f"{current.lstrip()}"
    )


def format_pdf_text(text: str) -> str:
    lines = _clean_lines(text)

    if not lines:
        return ""

    formatted_lines: list[str] = [
        lines[0]
    ]

    for current in lines[1:]:
        previous = formatted_lines[-1]

        if _starts_new_logical_block(
            current
        ):
            formatted_lines.append(
                current
            )
            continue

        if _previous_requires_new_line(
            previous
        ):
            formatted_lines.append(
                current
            )
            continue

        formatted_lines[-1] = (
            _join_lines(
                previous=previous,
                current=current,
            )
        )

    return "\n".join(
        formatted_lines
    ).strip()