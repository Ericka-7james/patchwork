from backend.parsing.structure import (
    parse_resume_structure,
)


def test_parse_resume_structure_parses_basic_profile():
    text = (
        "Ericka James\n"
        "james@example.com\n"
        "PROFESSIONAL SUMMARY\n"
        "Software Engineer with automation experience.\n"
        "CORE COMPETENCIES\n"
        "Technical Analysis • Data Analysis • Agile\n"
        "EDUCATION\n"
        "Spelman College — B.S. Computer Science, 2025\n"
        "PROFESSIONAL EXPERIENCE\n"
        "Example Company — Software Engineer Jan 2025 – Present\n"
        "● Built internal tools.\n"
        "● Added automated tests.\n"
        "PROJECTS\n"
        "PatchWork — Resume Platform Aug 2026 – Present\n"
        "● Built resume parsing workflows.\n"
        "CERTIFICATIONS\n"
        "AWS Certified Cloud Practitioner • Postman Certified\n"
        "SKILLS\n"
        "Languages: Python, Java, C++\n"
        "Cloud: AWS, Terraform"
    )

    result = parse_resume_structure(text)

    assert result["name"] == "Ericka James"

    assert result["contact"] == (
        "james@example.com"
    )

    assert result["summary"] == (
        "Software Engineer with automation experience."
    )

    assert result["core_competencies"] == [
        "Technical Analysis",
        "Data Analysis",
        "Agile",
    ]

    assert result["education"] == [
        "Spelman College — B.S. Computer Science, 2025"
    ]

    assert result["experience"] == [
        {
            "heading": (
                "Example Company — Software Engineer "
                "Jan 2025 – Present"
            ),
            "bullets": [
                "Built internal tools.",
                "Added automated tests.",
            ],
        }
    ]

    assert result["projects"] == [
        {
            "heading": (
                "PatchWork — Resume Platform "
                "Aug 2026 – Present"
            ),
            "bullets": [
                "Built resume parsing workflows."
            ],
        }
    ]

    assert result["certifications"] == [
        "AWS Certified Cloud Practitioner",
        "Postman Certified",
    ]

    assert result["skills"] == {
        "Languages": [
            "Python",
            "Java",
            "C++",
        ],
        "Cloud": [
            "AWS",
            "Terraform",
        ],
    }


def test_parse_resume_structure_handles_missing_sections():
    result = parse_resume_structure(
        "Ericka James\n"
        "PROFESSIONAL SUMMARY\n"
        "Software Engineer."
    )

    assert result["name"] == (
        "Ericka James"
    )

    assert result["summary"] == (
        "Software Engineer."
    )

    assert result["education"] == []
    assert result["experience"] == []
    assert result["projects"] == []
    assert result["certifications"] == []
    assert result["skills"] == {}


def test_parse_resume_structure_returns_empty_profile_for_empty_text():
    result = parse_resume_structure("")

    assert result == {
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