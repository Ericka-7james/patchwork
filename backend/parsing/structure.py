import re


SECTION_NAMES = {
    "PROFESSIONAL SUMMARY": "summary",
    "SUMMARY": "summary",
    "CORE COMPETENCIES": "core_competencies",
    "EDUCATION": "education",
    "PROFESSIONAL EXPERIENCE": "experience",
    "WORK EXPERIENCE": "experience",
    "EXPERIENCE": "experience",
    "PROJECTS": "projects",
    "CERTIFICATIONS": "certifications",
    "SKILLS": "skills",
}

BULLET_PATTERN = re.compile(
    r"^\s*[●•▪◦‣⁃■□◆◇]*\s*"
)

SKILL_ROW_PATTERN = re.compile(
    r"^([^:]{1,60}):\s*(.+)$"
)

EMAIL_PATTERN = re.compile(
    r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
    re.IGNORECASE,
)

PHONE_PATTERN = re.compile(
    r"(?:\+?1[\s.-]?)?"
    r"(?:\(?\d{3}\)?[\s.-]?)"
    r"\d{3}[\s.-]?\d{4}"
)

URL_PATTERN = re.compile(
    r"(?:https?://|www\.)[^\s|•·]+",
    re.IGNORECASE,
)

CONTACT_SEPARATOR_PATTERN = re.compile(
    r"\s*(?:\||•|·)\s*"
)

ADDRESS_PATTERN = re.compile(
    r"\b\d{1,6}\s+.+\b"
    r"(?:street|st|road|rd|avenue|ave|boulevard|blvd|"
    r"drive|dr|lane|ln|court|ct|way)\b",
    re.IGNORECASE,
)

LOCATION_PATTERN = re.compile(
    r"^[A-Za-z .'-]+,\s*[A-Za-z]{2,}(?:\s+\d{5}(?:-\d{4})?)?$"
)


def _clean_bullet(line: str) -> str:
    return BULLET_PATTERN.sub(
        "",
        line,
    ).strip()


def _split_bullet_values(text: str) -> list[str]:
    return [
        value.strip()
        for value in text.split("•")
        if value.strip()
    ]


def _parse_grouped_entries(
    lines: list[str],
    *,
    include_hidden: bool = False,
) -> list[dict]:
    entries: list[dict] = []
    current_entry: dict | None = None

    def create_entry(
        heading: str,
    ) -> dict:
        entry = {
            "heading": heading,
            "bullets": [],
        }

        if include_hidden:
            entry["hidden"] = False

        return entry

    for line in lines:
        if BULLET_PATTERN.match(line) and line[:1] in {
            "●",
            "•",
            "▪",
            "◦",
            "‣",
            "⁃",
            "■",
            "□",
            "◆",
            "◇",
        }:
            if current_entry is None:
                current_entry = create_entry("")
                entries.append(
                    current_entry
                )

            current_entry["bullets"].append(
                _clean_bullet(line)
            )

            continue

        current_entry = create_entry(line)

        entries.append(
            current_entry
        )

    return entries


def _parse_skills(
    lines: list[str],
) -> dict[str, list[str]]:
    skills: dict[str, list[str]] = {}

    for line in lines:
        match = SKILL_ROW_PATTERN.match(
            line
        )

        if not match:
            continue

        category = match.group(1).strip()
        values = match.group(2).strip()

        skills[category] = [
            value.strip()
            for value in values.split(",")
            if value.strip()
        ]

    return skills


def _empty_contact() -> dict:
    return {
        "location": "",
        "address": "",
        "email": "",
        "phone": "",
        "linkedin": "",
        "github": "",
        "website": "",
        "portfolio": "",
        "other": [],
    }


def _clean_url(value: str) -> str:
    return value.strip().rstrip(
        ".,;)"
    )


def _parse_contact(
    lines: list[str],
) -> dict:
    contact = _empty_contact()

    if not lines:
        return contact

    pieces: list[str] = []

    for line in lines:
        split_values = CONTACT_SEPARATOR_PATTERN.split(
            line
        )

        pieces.extend(
            value.strip()
            for value in split_values
            if value.strip()
        )

    other: list[str] = []

    for value in pieces:
        email_match = EMAIL_PATTERN.search(
            value
        )

        if email_match and not contact["email"]:
            contact["email"] = (
                email_match.group(0)
                .strip()
            )

            remaining = EMAIL_PATTERN.sub(
                "",
                value,
            ).strip(" -|•·,")

            if not remaining:
                continue

            value = remaining

        phone_match = PHONE_PATTERN.search(
            value
        )

        if phone_match and not contact["phone"]:
            contact["phone"] = (
                phone_match.group(0)
                .strip()
            )

            remaining = PHONE_PATTERN.sub(
                "",
                value,
            ).strip(" -|•·,")

            if not remaining:
                continue

            value = remaining

        lower_value = value.lower()

        if (
            "linkedin.com" in lower_value
            and not contact["linkedin"]
        ):
            url_match = URL_PATTERN.search(
                value
            )

            contact["linkedin"] = _clean_url(
                url_match.group(0)
                if url_match
                else value
            )

            continue

        if (
            "github.com" in lower_value
            and not contact["github"]
        ):
            url_match = URL_PATTERN.search(
                value
            )

            contact["github"] = _clean_url(
                url_match.group(0)
                if url_match
                else value
            )

            continue

        url_match = URL_PATTERN.search(
            value
        )

        if url_match:
            url = _clean_url(
                url_match.group(0)
            )

            if (
                any(
                    keyword in lower_value
                    for keyword in {
                        "portfolio",
                        "projects",
                    }
                )
                and not contact["portfolio"]
            ):
                contact["portfolio"] = url

            elif not contact["website"]:
                contact["website"] = url

            else:
                other.append(url)

            continue

        if (
            ADDRESS_PATTERN.search(value)
            and not contact["address"]
        ):
            contact["address"] = value
            continue

        if (
            LOCATION_PATTERN.match(value)
            and not contact["location"]
        ):
            contact["location"] = value
            continue

        if value not in other:
            other.append(value)

    contact["other"] = other

    return contact


def parse_resume_structure(
    text: str,
) -> dict:
    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    if not lines:
        return {
            "name": "",
            "contact": _empty_contact(),
            "summary": "",
            "core_competencies": [],
            "education": [],
            "experience": [],
            "projects": [],
            "certifications": [],
            "skills": {},
        }

    name = lines[0]

    contact_lines: list[str] = []

    body_start = 1

    while (
        body_start < len(lines)
        and lines[body_start].upper()
        not in SECTION_NAMES
        and len(contact_lines) < 4
    ):
        contact_lines.append(
            lines[body_start]
        )

        body_start += 1

    contact = _parse_contact(
        contact_lines
    )

    sections: dict[
        str,
        list[str],
    ] = {}

    current_section: str | None = None

    for line in lines[body_start:]:
        section_name = SECTION_NAMES.get(
            line.upper()
        )

        if section_name:
            current_section = section_name

            sections.setdefault(
                current_section,
                [],
            )

            continue

        if current_section:
            sections[
                current_section
            ].append(line)

    summary_lines = sections.get(
        "summary",
        [],
    )

    competency_lines = sections.get(
        "core_competencies",
        [],
    )

    certification_lines = sections.get(
        "certifications",
        [],
    )

    return {
        "name": name,
        "contact": contact,
        "summary": " ".join(
            summary_lines
        ).strip(),
        "core_competencies": (
            _split_bullet_values(
                " ".join(
                    competency_lines
                )
            )
        ),
        "education": sections.get(
            "education",
            [],
        ),
        "experience": (
            _parse_grouped_entries(
                sections.get(
                    "experience",
                    [],
                ),
                include_hidden=True,
            )
        ),
        "projects": (
            _parse_grouped_entries(
                sections.get(
                    "projects",
                    [],
                )
            )
        ),
        "certifications": (
            _split_bullet_values(
                " ".join(
                    certification_lines
                )
            )
        ),
        "skills": _parse_skills(
            sections.get(
                "skills",
                [],
            )
        ),
    }