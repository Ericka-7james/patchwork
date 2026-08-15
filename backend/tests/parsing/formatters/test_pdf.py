from parsing.formatters.pdf import (
    format_pdf_text,
)


def test_format_pdf_text_joins_wrapped_summary_lines():
    text = (
        "PROFESSIONAL SUMMARY\n"
        "Software Engineer with experience in automation, data\n"
        "analysis, process improvement, and operations.\n"
        "Skilled in technical analysis and communication."
    )

    assert format_pdf_text(text) == (
        "PROFESSIONAL SUMMARY\n"
        "Software Engineer with experience in automation, data "
        "analysis, process improvement, and operations. "
        "Skilled in technical analysis and communication."
    )


def test_format_pdf_text_joins_wrapped_bullet_lines():
    text = (
        "PROFESSIONAL EXPERIENCE\n"
        "● Designed a workflow that reviews product data hourly and\n"
        "updates website content automatically.\n"
        "● Added automated tests."
    )

    assert format_pdf_text(text) == (
        "PROFESSIONAL EXPERIENCE\n"
        "● Designed a workflow that reviews product data hourly and "
        "updates website content automatically.\n"
        "● Added automated tests."
    )


def test_format_pdf_text_preserves_section_headings():
    text = (
        "Software Engineer with production experience.\n"
        "CORE COMPETENCIES\n"
        "Technical Analysis • Data Analysis"
    )

    assert format_pdf_text(text) == (
        "Software Engineer with production experience.\n"
        "CORE COMPETENCIES\n"
        "Technical Analysis • Data Analysis"
    )


def test_format_pdf_text_joins_wrapped_competencies():
    text = (
        "CORE COMPETENCIES\n"
        "Technical Analysis • Program Support • Data Analysis •\n"
        "Stakeholder Communication • Workflow Improvement •\n"
        "Operational Support"
    )

    assert format_pdf_text(text) == (
        "CORE COMPETENCIES\n"
        "Technical Analysis • Program Support • Data Analysis • "
        "Stakeholder Communication • Workflow Improvement • "
        "Operational Support"
    )


def test_format_pdf_text_preserves_education_entries():
    text = (
        "EDUCATION\n"
        "Spelman College — B.S. Computer Science, 2025\n"
        "Google Tech Exchange — Machine Learning Program, 2023"
    )

    assert format_pdf_text(text) == (
        "EDUCATION\n"
        "Spelman College — B.S. Computer Science, 2025\n"
        "Google Tech Exchange — Machine Learning Program, 2023"
    )


def test_format_pdf_text_preserves_dated_experience_entries():
    text = (
        "PROFESSIONAL EXPERIENCE\n"
        "JPMorgan Chase & Co — Software Engineer "
        "Feb 2025 – Nov 2025\n"
        "● Built production software.\n"
        "JPMorgan Chase & Co — Software Engineer Intern "
        "Jun 2024 – Jan 2025\n"
        "● Built internal tools."
    )

    assert format_pdf_text(text) == (
        "PROFESSIONAL EXPERIENCE\n"
        "JPMorgan Chase & Co — Software Engineer "
        "Feb 2025 – Nov 2025\n"
        "● Built production software.\n"
        "JPMorgan Chase & Co — Software Engineer Intern "
        "Jun 2024 – Jan 2025\n"
        "● Built internal tools."
    )


def test_format_pdf_text_preserves_skill_rows():
    text = (
        "SKILLS\n"
        "Languages: Java, Python, C++, JavaScript\n"
        "Cloud and DevOps: AWS, Terraform, Docker\n"
        "Engineering Practices: Automated Testing, Debugging,\n"
        "Requirements Analysis, System Design"
    )

    assert format_pdf_text(text) == (
        "SKILLS\n"
        "Languages: Java, Python, C++, JavaScript\n"
        "Cloud and DevOps: AWS, Terraform, Docker\n"
        "Engineering Practices: Automated Testing, Debugging, "
        "Requirements Analysis, System Design"
    )


def test_format_pdf_text_preserves_contact_line():
    text = (
        "Ericka James\n"
        "james@example.com • linkedin.com/in/example • "
        "(706) 555-1212\n"
        "PROFESSIONAL SUMMARY"
    )

    assert format_pdf_text(text) == (
        "Ericka James\n"
        "james@example.com • linkedin.com/in/example • "
        "(706) 555-1212\n"
        "PROFESSIONAL SUMMARY"
    )


def test_format_pdf_text_removes_blank_lines():
    text = (
        "PROFESSIONAL SUMMARY\n"
        "\n"
        "Software Engineer with experience.\n"
        "\n"
        "SKILLS\n"
        "Languages: Python"
    )

    assert format_pdf_text(text) == (
        "PROFESSIONAL SUMMARY\n"
        "Software Engineer with experience.\n"
        "SKILLS\n"
        "Languages: Python"
    )


def test_format_pdf_text_returns_empty_string_for_empty_input():
    assert format_pdf_text("") == ""