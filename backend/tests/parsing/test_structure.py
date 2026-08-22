from parsing.structure import (
    parse_resume_structure,
)


EMPTY_CONTACT = {
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

    assert result["contact"] == {
        **EMPTY_CONTACT,
        "email": "james@example.com",
    }

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
            "hidden": False,
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


def test_parse_resume_structure_parses_contact_information():
    text = (
        "Ericka James\n"
        "Atlanta, GA | ericka@example.com | (404) 555-1111\n"
        "linkedin.com/in/ericka | github.com/ericka\n"
        "https://erickajames.dev\n"
        "SUMMARY\n"
        "Software Engineer."
    )

    result = parse_resume_structure(text)

    contact = result["contact"]

    assert contact["location"] == "Atlanta, GA"
    assert contact["email"] == "ericka@example.com"
    assert contact["phone"] == "(404) 555-1111"
    assert contact["linkedin"] == "linkedin.com/in/ericka"
    assert contact["github"] == "github.com/ericka"
    assert contact["website"] == "https://erickajames.dev"


def test_parse_resume_structure_defaults_experience_to_visible():
    text = (
        "Ericka James\n"
        "james@example.com\n"
        "EXPERIENCE\n"
        "Company A — Software Engineer\n"
        "● Built production software.\n"
        "● Improved reliability."
    )

    result = parse_resume_structure(text)

    assert result["experience"] == [
        {
            "heading": "Company A — Software Engineer",
            "bullets": [
                "Built production software.",
                "Improved reliability.",
            ],
            "hidden": False,
        }
    ]


def test_parse_resume_structure_does_not_add_hidden_to_projects():
    text = (
        "Ericka James\n"
        "james@example.com\n"
        "PROJECTS\n"
        "PatchWork\n"
        "● Built resume tooling."
    )

    result = parse_resume_structure(text)

    assert result["projects"] == [
        {
            "heading": "PatchWork",
            "bullets": [
                "Built resume tooling.",
            ],
        }
    ]

    assert "hidden" not in result["projects"][0]


def test_parse_resume_structure_handles_missing_sections():
    result = parse_resume_structure(
        "Ericka James\n"
        "PROFESSIONAL SUMMARY\n"
        "Software Engineer."
    )

    assert result["name"] == "Ericka James"

    assert result["contact"] == EMPTY_CONTACT

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
        "contact": EMPTY_CONTACT,
        "summary": "",
        "core_competencies": [],
        "education": [],
        "experience": [],
        "projects": [],
        "certifications": [],
        "skills": {},
    }