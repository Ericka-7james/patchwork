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
    r"^\s*[●•▪◦‣⁃■□◆◇]\s*"
)

SKILL_ROW_PATTERN = re.compile(
    r"^([^:]{1,60}):\s*(.+)$"
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
        if BULLET_PATTERN.match(line):
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
            "contact": "",
            "summary": "",
            "core_competencies": [],
            "education": [],
            "experience": [],
            "projects": [],
            "certifications": [],
            "skills": {},
        }

    name = lines[0]

    contact = ""

    body_start = 1

    if (
        len(lines) > 1
        and lines[1] not in SECTION_NAMES
    ):
        contact = lines[1]
        body_start = 2

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