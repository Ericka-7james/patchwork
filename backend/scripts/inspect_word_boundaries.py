import sys
from pathlib import Path

import pymupdf
from docx import Document


SUSPICIOUS_TERMS = [
    "resolveproduct-flow",
    "technicaland",
    "supportconsistent",
    "GeorgiaTech",
    "modules,LEDs",
    "experience,skill",
    "GoogleWorkspace",
    "andcross-functional",
    "WorkflowImprovement",
    "pipelinethat",
    "dailyproduction",
    "recurringdefects",
    "workflowsto",
    "quality-assuranceand",
]


def inspect_docx(file_path: Path) -> None:
    document = Document(file_path)

    print("\n===== DOCX PARAGRAPHS + RUNS =====\n")

    found_any = False

    for index, paragraph in enumerate(document.paragraphs):
        text = paragraph.text

        if not any(
            term.lower() in text.lower()
            for term in SUSPICIOUS_TERMS
        ):
            continue

        found_any = True

        print(f"PARAGRAPH {index}")
        print(f"TEXT: {text!r}")

        for run_index, run in enumerate(paragraph.runs):
            print(
                f"  RUN {run_index}: {run.text!r}"
            )

        print()

    if not found_any:
        print(
            "None of the known suspicious joined terms "
            "exist in the DOCX paragraph text."
        )

    print("\n===== END DOCX =====\n")


def inspect_pdf(file_path: Path) -> None:
    document = pymupdf.open(file_path)

    print("\n===== PDF WORD POSITIONS =====\n")

    found_any = False

    try:
        for page_index, page in enumerate(document):
            plain_text = page.get_text(
                "text",
                sort=True,
            )

            suspicious_lines = [
                line
                for line in plain_text.splitlines()
                if any(
                    term.lower() in line.lower()
                    for term in SUSPICIOUS_TERMS
                )
            ]

            if not suspicious_lines:
                continue

            found_any = True

            print(f"PAGE {page_index + 1}")

            for line in suspicious_lines:
                print(f"TEXT LINE: {line!r}")

            print("\nWORDS:")

            words = page.get_text(
                "words",
                sort=True,
            )

            for word in words:
                x0, y0, x1, y1, text, *_ = word

                if any(
                    part.lower() in text.lower()
                    for part in [
                        "resolve",
                        "product",
                        "technical",
                        "and",
                        "support",
                        "consistent",
                        "Georgia",
                        "Tech",
                        "modules",
                        "LEDs",
                        "experience",
                        "skill",
                        "Google",
                        "Workspace",
                    ]
                ):
                    print(
                        f"  {text!r} "
                        f"x0={x0:.2f} "
                        f"x1={x1:.2f} "
                        f"y0={y0:.2f} "
                        f"y1={y1:.2f}"
                    )

            print()

        if not found_any:
            print(
                "None of the known suspicious joined terms "
                "exist in PyMuPDF's raw PDF text."
            )

    finally:
        document.close()

    print("\n===== END PDF =====\n")


def main() -> None:
    if len(sys.argv) != 2:
        print(
            "Usage: python -m "
            "backend.scripts.inspect_word_boundaries "
            "<file-path>"
        )
        raise SystemExit(1)

    file_path = Path(sys.argv[1])

    if not file_path.exists():
        print(f"File not found: {file_path}")
        raise SystemExit(1)

    suffix = file_path.suffix.lower()

    if suffix == ".docx":
        inspect_docx(file_path)
        return

    if suffix == ".pdf":
        inspect_pdf(file_path)
        return

    print("Only PDF and DOCX files are supported.")
    raise SystemExit(1)


if __name__ == "__main__":
    main()