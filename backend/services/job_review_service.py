from __future__ import annotations

import asyncio
import html
import os
import re
from datetime import datetime, timezone
from email.utils import parseaddr
from typing import Any

import httpx


SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    "",
)

SUPABASE_PUBLISHABLE_KEY = os.getenv(
    "SUPABASE_PUBLISHABLE_KEY",
    "",
)

MAX_CONCURRENT_SUPABASE_UPDATES = 8


REJECTION_PHRASES = (
    "not moving forward",
    "will not be moving forward",
    "won't be moving forward",
    "other candidates",
    "not selected",
    "not be selected",
    "decided not to proceed",
    "unable to move forward",
    "position has been filled",
    "unfortunately",
    "we will not proceed",
    "we have decided to move forward with another",
    "we have decided to pursue other candidates",
    "we have chosen another candidate",
)

INTERVIEW_PHRASES = (
    "interview",
    "phone screen",
    "phone interview",
    "virtual interview",
    "recruiter screen",
    "recruiter call",
    "schedule a call",
    "schedule time",
    "schedule your",
    "availability for",
    "meet with",
    "conversation with",
)

MOVING_FORWARD_PHRASES = (
    "next step",
    "next steps",
    "move forward",
    "moving forward",
    "assessment",
    "technical screen",
    "technical assessment",
    "coding assessment",
    "final round",
    "background check",
    "under review",
    "under consideration",
    "offer letter",
    "job offer",
)

APPLICATION_PHRASES = (
    "application received",
    "application has been received",
    "received your application",
    "received your job application",
    "received your resume",
    "we've received your resume",
    "we have received your resume",
    "thank you for applying",
    "thanks for applying",
    "successfully applied",
    "application confirmation",
    "application was sent",
    "application is complete",
)


IRRELEVANT_PHRASES = (
    "price drops",
    "market update",
    "spending update",
    "payment method",
    "payment details",
    "return policy",
    "birthday offer",
    "initiation fee",
    "$0 initiation",
    "weekly wardrobe",
    "recent visit unlocked",
    "special offer",
    "limited time offer",
    "jobs similar to",
    "more jobs for you",
    "jobs in your area",
    "apply now to",
    "is hiring for a",
    "is hiring for an",
    "dream role is here",
    "job recommendations",
    "recommended jobs",
    "reacted to this post",
    "skill to your profile",
    "verify your candidate account",
    "reset your password",
)


GENERIC_COMPANY_NAMES = {
    "",
    "needs review",
    "workday",
    "myworkday",
    "myworkdayjobs",
    "workflow",
    "workable",
    "adp",
    "icims",
    "indeed",
    "indeed apply",
    "linkedin",
    "send",
    "people operations",
    "people team",
    "human resources",
    "talent acquisition",
    "recruiting",
    "recruitment",
    "employment review team",
}


GENERIC_ROLE_NAMES = {
    "",
    "needs review",
    "application received",
    "application update",
    "status update",
    "application status update",
    "job application update",
    "job application status update",
    "thank you for applying",
    "thanks for applying",
    "thank you for your application",
    "your application",
    "application status",
    "next steps",
    "next step",
}


ROLE_TRAILING_PHRASES = (
    "click here to",
    "candidate data privacy",
    "privacy notice",
    "privacy policy",
    "and appreciate the time",
    "thank you for",
    "thanks for",
    "we appreciate",
    "hello ericka",
    "dear ericka",
)


SELECT_FIELDS = (
    "id,user_id,company,role,"
    "status,status_source,"
    "applied_at,last_email_at,"
    "gmail_thread_id,"
    "gmail_message_id,notes,"
    "created_at,updated_at"
)


def _supabase_headers(
    access_token: str,
) -> dict[str, str]:
    if (
        not SUPABASE_URL
        or not SUPABASE_PUBLISHABLE_KEY
    ):
        raise RuntimeError(
            "Supabase environment "
            "variables are not configured."
        )

    return {
        "apikey": (
            SUPABASE_PUBLISHABLE_KEY
        ),
        "Authorization": (
            f"Bearer {access_token}"
        ),
        "Content-Type": (
            "application/json"
        ),
    }


def _clean_email_body(
    value: str,
) -> str:
    text = html.unescape(
        value or ""
    )

    text = re.sub(
        r"<style.*?>.*?</style>",
        " ",
        text,
        flags=(
            re.IGNORECASE
            | re.DOTALL
        ),
    )

    text = re.sub(
        r"<script.*?>.*?</script>",
        " ",
        text,
        flags=(
            re.IGNORECASE
            | re.DOTALL
        ),
    )

    text = re.sub(
        r"<[^>]+>",
        " ",
        text,
    )

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


def _normalized_text(
    value: str | None,
) -> str:
    return re.sub(
        r"\s+",
        " ",
        str(
            value or ""
        ),
    ).strip()


def _normalize_key_part(
    value: str | None,
) -> str:
    normalized = (
        _normalized_text(
            value
        ).lower()
    )

    normalized = re.sub(
        r"\b("
        r"incorporated|"
        r"corporation|"
        r"company|"
        r"limited|"
        r"inc|"
        r"corp|"
        r"llc|"
        r"ltd"
        r")\b",
        " ",
        normalized,
    )

    normalized = re.sub(
        r"[^a-z0-9]+",
        " ",
        normalized,
    )

    return re.sub(
        r"\s+",
        " ",
        normalized,
    ).strip()


def _message_text(
    message: dict[str, Any],
) -> str:
    return " ".join(
        [
            str(
                message.get(
                    "subject",
                    "",
                )
            ),
            str(
                message.get(
                    "snippet",
                    "",
                )
            ),
            str(
                message.get(
                    "body",
                    "",
                )
            )[:5000],
        ]
    ).lower()


def _is_generic_company(
    company: str | None,
) -> bool:
    return (
        _normalized_text(
            company
        ).lower()
        in GENERIC_COMPANY_NAMES
    )


def _is_generic_role(
    role: str | None,
) -> bool:
    normalized = (
        _normalized_text(
            role
        )
        .strip(
            " -:|.!"
        )
        .lower()
    )

    return (
        normalized
        in GENERIC_ROLE_NAMES
    )


def is_relevant_job_message(
    message: dict[str, Any],
) -> bool:
    combined = (
        _message_text(
            message
        )
    )

    if any(
        phrase in combined
        for phrase
        in IRRELEVANT_PHRASES
    ):
        return False

    strong_signals = (
        *REJECTION_PHRASES,
        *INTERVIEW_PHRASES,
        *MOVING_FORWARD_PHRASES,
        *APPLICATION_PHRASES,
        "application status",
        "job application",
        "candidate reference",
    )

    return any(
        signal in combined
        for signal
        in strong_signals
    )


def classify_job_status(
    *,
    subject: str,
    body: str,
    snippet: str,
) -> str:
    combined = " ".join(
        [
            subject,
            body,
            snippet,
        ]
    ).lower()

    if any(
        phrase in combined
        for phrase
        in REJECTION_PHRASES
    ):
        return "rejected"

    if any(
        phrase in combined
        for phrase
        in INTERVIEW_PHRASES
    ):
        return "interview"

    if any(
        phrase in combined
        for phrase
        in MOVING_FORWARD_PHRASES
    ):
        return "moving_forward"

    if any(
        phrase in combined
        for phrase
        in APPLICATION_PHRASES
    ):
        return "applied"

    return "needs_review"


def _clean_company(
    value: str,
) -> str:
    company = (
        _normalized_text(
            value
        )
        .strip(
            " -:|.,"
        )
    )

    company = re.sub(
        r"^(the\s+)",
        "",
        company,
        flags=re.IGNORECASE,
    )

    company = re.sub(
        r"\s+",
        " ",
        company,
    ).strip()

    if (
        not company
        or len(company) > 100
    ):
        return "Needs review"

    return company


def _extract_company_from_subject(
    subject: str,
) -> str | None:
    patterns = (
        (
            r"your application was sent to "
            r"(.+?)(?:[.!]|$)"
        ),
        (
            r"application was sent to "
            r"(.+?)(?:[.!]|$)"
        ),
        (
            r"thanks for applying to "
            r"(.+?)(?:[.!|]|$)"
        ),
        (
            r"thank you for applying to "
            r"(.+?)(?:[.!|]|$)"
        ),
        (
            r"thanks for applying at "
            r"(.+?)(?:[.!|]|$)"
        ),
        (
            r"thank you for applying at "
            r"(.+?)(?:[.!|]|$)"
        ),
        (
            r"thank you from "
            r"(.+?)(?:\s*[-|]|$)"
        ),
        (
            r"application with "
            r"(.+?)(?:[.!|]|$)"
        ),
        (
            r"job application to "
            r".+?\s+at\s+"
            r"(.+?)(?:[.!|]|$)"
        ),
        (
            r"application.+?\bat "
            r"(.+?)(?:[.!|]|$)"
        ),
        (
            r"next steps with "
            r"(.+?)(?:[.!|]|$)"
        ),
        (
            r"phone screen (?:with|for) "
            r"(.+?)(?:[.!|]|$)"
        ),
    )

    for pattern in patterns:
        match = re.search(
            pattern,
            subject,
            flags=re.IGNORECASE,
        )

        if not match:
            continue

        company = (
            _clean_company(
                match.group(1)
            )
        )

        if not _is_generic_company(
            company
        ):
            return company

    return None


def _extract_company_from_content(
    body: str,
    snippet: str,
) -> str | None:
    searchable = " ".join(
        [
            snippet,
            body[:2500],
        ]
    )

    patterns = (
        (
            r"thanks for applying to "
            r"([A-Z][A-Za-z0-9&'’.\- ]{1,80})"
        ),
        (
            r"thank you for applying to "
            r"([A-Z][A-Za-z0-9&'’.\- ]{1,80})"
        ),
        (
            r"thank you for your interest in "
            r"([A-Z][A-Za-z0-9&'’.\- ]{1,80})"
        ),
        (
            r"your application (?:to|with) "
            r"([A-Z][A-Za-z0-9&'’.\- ]{1,80})"
        ),
        (
            r"application at "
            r"([A-Z][A-Za-z0-9&'’.\- ]{1,80})"
        ),
    )

    for pattern in patterns:
        match = re.search(
            pattern,
            searchable,
            flags=re.IGNORECASE,
        )

        if not match:
            continue

        company = (
            _clean_company(
                match.group(1)
            )
        )

        company = re.split(
            (
                r"\b("
                r"for|regarding|"
                r"we|your|the position"
                r")\b"
            ),
            company,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0].strip()

        if (
            company
            and not _is_generic_company(
                company
            )
        ):
            return company

    return None


def _extract_sender_company(
    sender: str,
) -> str:
    display_name, email_address = (
        parseaddr(
            sender
        )
    )

    display_name = (
        display_name.strip()
    )

    if display_name:
        cleaned_name = re.sub(
            (
                r"\b("
                r"recruiting|"
                r"recruitment|"
                r"talent acquisition|"
                r"careers|"
                r"jobs|"
                r"people team|"
                r"human resources|"
                r"hiring team"
                r")\b"
            ),
            "",
            display_name,
            flags=re.IGNORECASE,
        )

        cleaned_name = (
            _clean_company(
                cleaned_name
            )
        )

        if not _is_generic_company(
            cleaned_name
        ):
            return cleaned_name

    if "@" in email_address:
        domain = (
            email_address
            .split(
                "@",
                1,
            )[1]
            .lower()
        )

        domain_root = (
            domain
            .split(
                ".",
                1,
            )[0]
            .replace(
                "-",
                " ",
            )
        )

        company = (
            _clean_company(
                domain_root.title()
            )
        )

        if not _is_generic_company(
            company
        ):
            return company

    return "Needs review"


def _extract_company(
    *,
    sender: str,
    subject: str,
    body: str,
    snippet: str,
) -> str:
    subject_company = (
        _extract_company_from_subject(
            subject
        )
    )

    if subject_company:
        return subject_company

    content_company = (
        _extract_company_from_content(
            body,
            snippet,
        )
    )

    if content_company:
        return content_company

    return _extract_sender_company(
        sender
    )


def _clean_role(
    value: str,
) -> str:
    role = (
        _normalized_text(
            value
        )
        .strip(
            " -:|.,!"
        )
    )

    role = re.sub(
        r"^(the\s+position\s+of\s+)",
        "",
        role,
        flags=re.IGNORECASE,
    )

    role = re.sub(
        r"^(the\s+)",
        "",
        role,
        flags=re.IGNORECASE,
    )

    role = re.sub(
        r"\s+position$",
        "",
        role,
        flags=re.IGNORECASE,
    )

    role = re.sub(
        r"\s+role$",
        "",
        role,
        flags=re.IGNORECASE,
    )

    lower_role = (
        role.lower()
    )

    cut_positions = [
        lower_role.find(
            phrase
        )
        for phrase
        in ROLE_TRAILING_PHRASES
        if lower_role.find(
            phrase
        ) > 0
    ]

    if cut_positions:
        role = role[
            :min(
                cut_positions
            )
        ].strip(
            " -:|.,"
        )

    role = re.sub(
        r"\s+",
        " ",
        role,
    ).strip()

    if (
        not role
        or len(role) > 120
        or _is_generic_role(
            role
        )
    ):
        return "Needs review"

    return role


def _extract_role(
    *,
    subject: str,
    body: str,
    snippet: str,
    company: str,
) -> str:
    subject = (
        _normalized_text(
            subject
        )
    )

    searchable = " ".join(
        [
            subject,
            _normalized_text(
                snippet
            ),
            _normalized_text(
                body
            )[:2200],
        ]
    )

    patterns = (
        (
            r"indeed application:\s*"
            r"(.+?)(?:$|[|])"
        ),
        (
            r"application received for "
            r"(?:ericka james\s*[-:]\s*)?"
            r"(.+?)(?:$|[|])"
        ),
        (
            r"regarding your job application to "
            r"(.+?)\s+at\s+"
        ),
        (
            r"received your resume for "
            r"(?:the )?"
            r"(.+?)\s+position"
        ),
        (
            r"received your job application for "
            r"(.+?)(?:[.!|]|$)"
        ),
        (
            r"received your application for "
            r"(.+?)(?:[.!|]|$)"
        ),
        (
            r'you[r]?\s+"([^"]+)" '
            r"application is complete"
        ),
        (
            r"application:\s*"
            r"(.+?)\s+at\s+"
        ),
        (
            r"position of\s+"
            r"(.+?)(?:\s+at\s+|[.!|]|$)"
        ),
        (
            r"position\s*[:\-]\s*"
            r"(.+?)(?:[.!|]|$)"
        ),
        (
            r"phone screen for "
            r"(.+?)(?:[.!|]|$)"
        ),
        (
            r"interview "
            r"(?:confirmation details:\s*)?"
            r"(.+?)(?:\s+-\s+[A-Z][a-z]+,?\s+[A-Z]{2}|$)"
        ),
        (
            r"interview "
            r"(?:for|regarding) "
            r"(?:the )?"
            r"(.+?)"
            r"(?: position| role| at|[.!|]|$)"
        ),
        (
            r"for the "
            r"(.+?) "
            r"(?:position|role)"
        ),
    )

    for pattern in patterns:
        match = re.search(
            pattern,
            searchable,
            flags=re.IGNORECASE,
        )

        if not match:
            continue

        role = (
            _clean_role(
                match.group(1)
            )
        )

        if role != "Needs review":
            return role

    cleaned_subject = re.sub(
        r"^(re|fw|fwd)\s*:\s*",
        "",
        subject,
        flags=re.IGNORECASE,
    )

    if company != "Needs review":
        escaped_company = (
            re.escape(
                company
            )
        )

        cleaned_subject = re.sub(
            rf"\s+at\s+{escaped_company}.*$",
            "",
            cleaned_subject,
            flags=re.IGNORECASE,
        )

        cleaned_subject = re.sub(
            rf"\s*[-|]\s*{escaped_company}.*$",
            "",
            cleaned_subject,
            flags=re.IGNORECASE,
        )

    prefix_patterns = (
        r"^regarding your job application to\s+",
        r"^application received for\s+",
        r"^application received\s*[-:]*\s*",
        r"^application update\s*[-:]*\s*",
        r"^application status update\s*[-:]*\s*",
        r"^job application status update\s*[-:]*\s*",
        r"^your application\s*[-:]*\s*",
        r"^thank you for applying\s*[-:]*\s*",
        r"^thanks for applying\s*[-:]*\s*",
        r"^thank you for your application\s*[-:]*\s*",
        r"^interview invitation\s*[-:]*\s*",
        r"^next steps\s*[-:]*\s*",
        r"^next step\s*[-:]*\s*",
    )

    for pattern in prefix_patterns:
        cleaned_subject = re.sub(
            pattern,
            "",
            cleaned_subject,
            flags=re.IGNORECASE,
        )

    cleaned_subject = (
        _clean_role(
            cleaned_subject
        )
    )

    if (
        cleaned_subject
        != "Needs review"
    ):
        return cleaned_subject

    return "Needs review"


def build_job_application(
    message: dict[str, Any],
) -> dict[str, Any]:
    subject = (
        _normalized_text(
            message.get(
                "subject"
            )
        )
    )

    body = (
        _clean_email_body(
            str(
                message.get(
                    "body",
                    "",
                )
            )
        )
    )

    snippet = (
        _clean_email_body(
            str(
                message.get(
                    "snippet",
                    "",
                )
            )
        )
    )

    status = (
        classify_job_status(
            subject=subject,
            body=body,
            snippet=snippet,
        )
    )

    company = (
        _extract_company(
            sender=str(
                message.get(
                    "from",
                    "",
                )
            ),
            subject=subject,
            body=body,
            snippet=snippet,
        )
    )

    role = (
        _extract_role(
            subject=subject,
            body=body,
            snippet=snippet,
            company=company,
        )
    )

    email_date = (
        message.get(
            "date"
        )
    )

    return {
        "company": company,
        "role": role,
        "status": status,
        "status_source": "email",
        "applied_at": (
            email_date
            if status
            == "applied"
            else None
        ),
        "last_email_at": (
            email_date
        ),
        "gmail_thread_id": (
            message.get(
                "thread_id"
            )
        ),
        "gmail_message_id": (
            message.get(
                "id"
            )
        ),
        "notes": None,
        "_relevant": (
            is_relevant_job_message(
                message
            )
        ),
    }


def _parse_date(
    value: str | None,
) -> datetime:
    if not value:
        return datetime.min.replace(
            tzinfo=timezone.utc
        )

    try:
        parsed = (
            datetime.fromisoformat(
                value.replace(
                    "Z",
                    "+00:00",
                )
            )
        )

        if parsed.tzinfo is None:
            parsed = (
                parsed.replace(
                    tzinfo=timezone.utc
                )
            )

        return parsed

    except ValueError:
        return datetime.min.replace(
            tzinfo=timezone.utc
        )


def _same_company(
    left: str | None,
    right: str | None,
) -> bool:
    left_key = (
        _normalize_key_part(
            left
        )
    )

    right_key = (
        _normalize_key_part(
            right
        )
    )

    if (
        not left_key
        or not right_key
        or left_key
        == "needs review"
        or right_key
        == "needs review"
    ):
        return False

    if left_key == right_key:
        return True

    if (
        left_key in right_key
        or right_key in left_key
    ):
        return (
            min(
                len(left_key),
                len(right_key),
            )
            >= 4
        )

    return False


def _same_role(
    left: str | None,
    right: str | None,
) -> bool:
    left_key = (
        _normalize_key_part(
            left
        )
    )

    right_key = (
        _normalize_key_part(
            right
        )
    )

    if (
        not left_key
        or not right_key
        or left_key
        == "needs review"
        or right_key
        == "needs review"
    ):
        return False

    if left_key == right_key:
        return True

    left_without_id = re.sub(
        r"\b[a-z]*\d{4,}\b",
        "",
        left_key,
    ).strip()

    right_without_id = re.sub(
        r"\b[a-z]*\d{4,}\b",
        "",
        right_key,
    ).strip()

    if (
        left_without_id
        == right_without_id
        and left_without_id
    ):
        return True

    return False


def _applications_match(
    left: dict[str, Any],
    right: dict[str, Any],
) -> bool:
    left_thread = (
        left.get(
            "gmail_thread_id"
        )
    )

    right_thread = (
        right.get(
            "gmail_thread_id"
        )
    )

    if (
        left_thread
        and right_thread
        and left_thread
        == right_thread
    ):
        return True

    same_company = (
        _same_company(
            left.get(
                "company"
            ),
            right.get(
                "company"
            ),
        )
    )

    same_role = (
        _same_role(
            left.get(
                "role"
            ),
            right.get(
                "role"
            ),
        )
    )

    if (
        same_company
        and same_role
    ):
        return True

    if same_company:
        left_role = (
            left.get(
                "role"
            )
        )

        right_role = (
            right.get(
                "role"
            )
        )

        if (
            _is_generic_role(
                left_role
            )
            or _is_generic_role(
                right_role
            )
        ):
            return True

    return False


def _choose_company(
    applications: list[
        dict[str, Any]
    ],
) -> str:
    companies = [
        str(
            application.get(
                "company",
                "",
            )
        )
        for application
        in applications
        if not _is_generic_company(
            application.get(
                "company"
            )
        )
    ]

    if not companies:
        return "Needs review"

    return max(
        companies,
        key=len,
    )


def _choose_role(
    applications: list[
        dict[str, Any]
    ],
) -> str:
    roles = [
        str(
            application.get(
                "role",
                "",
            )
        )
        for application
        in applications
        if not _is_generic_role(
            application.get(
                "role"
            )
        )
    ]

    if not roles:
        return "Needs review"

    return min(
        roles,
        key=len,
    )


def _group_applications(
    applications: list[
        dict[str, Any]
    ],
) -> list[dict[str, Any]]:
    relevant = [
        application
        for application
        in applications
        if application.get(
            "_relevant"
        )
    ]

    relevant.sort(
        key=lambda item: (
            _parse_date(
                item.get(
                    "last_email_at"
                )
            )
        )
    )

    groups: list[
        list[dict[str, Any]]
    ] = []

    for application in relevant:
        matching_group = None

        for group in groups:
            if any(
                _applications_match(
                    application,
                    existing,
                )
                for existing
                in group
            ):
                matching_group = (
                    group
                )

                break

        if matching_group is None:
            groups.append(
                [
                    application
                ]
            )
        else:
            matching_group.append(
                application
            )

    grouped: list[
        dict[str, Any]
    ] = []

    for group in groups:
        sorted_group = sorted(
            group,
            key=lambda item: (
                _parse_date(
                    item.get(
                        "last_email_at"
                    )
                )
            ),
        )

        latest = {
            **sorted_group[-1]
        }

        latest[
            "company"
        ] = _choose_company(
            sorted_group
        )

        latest[
            "role"
        ] = _choose_role(
            sorted_group
        )

        applied_dates = [
            item.get(
                "applied_at"
            )
            for item
            in sorted_group
            if item.get(
                "applied_at"
            )
        ]

        if applied_dates:
            latest[
                "applied_at"
            ] = min(
                applied_dates,
                key=_parse_date,
            )

        latest.pop(
            "_relevant",
            None,
        )

        grouped.append(
            latest
        )

    return sorted(
        grouped,
        key=lambda item: (
            _parse_date(
                item.get(
                    "last_email_at"
                )
            )
        ),
        reverse=True,
    )


def _find_existing_match(
    *,
    existing_jobs: list[
        dict[str, Any]
    ],
    application: dict[str, Any],
) -> dict[str, Any] | None:
    message_id = (
        application.get(
            "gmail_message_id"
        )
    )

    if message_id:
        for existing in (
            existing_jobs
        ):
            if (
                existing.get(
                    "gmail_message_id"
                )
                == message_id
            ):
                return existing

    thread_id = (
        application.get(
            "gmail_thread_id"
        )
    )

    if thread_id:
        for existing in (
            existing_jobs
        ):
            if (
                existing.get(
                    "gmail_thread_id"
                )
                == thread_id
            ):
                return existing

    for existing in existing_jobs:
        if _applications_match(
            existing,
            application,
        ):
            return existing

    return None


async def _get_existing_jobs(
    *,
    client: httpx.AsyncClient,
    access_token: str,
    user_id: str,
) -> list[dict[str, Any]]:
    response = await client.get(
        (
            f"{SUPABASE_URL}"
            "/rest/v1/job_applications"
        ),
        headers=_supabase_headers(
            access_token
        ),
        params={
            "select": (
                SELECT_FIELDS
            ),
            "user_id": (
                f"eq.{user_id}"
            ),
        },
    )

    response.raise_for_status()

    rows = response.json()

    if not isinstance(
        rows,
        list,
    ):
        return []

    return rows


def _build_update_payload(
    *,
    existing: dict[str, Any],
    application: dict[str, Any],
) -> dict[str, Any]:
    preserve_manual_status = (
        existing.get(
            "status_source"
        )
        == "manual"
    )

    incoming_company = (
        application.get(
            "company"
        )
    )

    incoming_role = (
        application.get(
            "role"
        )
    )

    company = (
        existing.get(
            "company"
        )
        if _is_generic_company(
            incoming_company
        )
        else incoming_company
    )

    role = (
        existing.get(
            "role"
        )
        if _is_generic_role(
            incoming_role
        )
        else incoming_role
    )

    incoming_last_email = (
        application.get(
            "last_email_at"
        )
    )

    existing_last_email = (
        existing.get(
            "last_email_at"
        )
    )

    if (
        _parse_date(
            incoming_last_email
        )
        >= _parse_date(
            existing_last_email
        )
    ):
        last_email_at = (
            incoming_last_email
        )

        gmail_thread_id = (
            application.get(
                "gmail_thread_id"
            )
            or existing.get(
                "gmail_thread_id"
            )
        )

        gmail_message_id = (
            application.get(
                "gmail_message_id"
            )
            or existing.get(
                "gmail_message_id"
            )
        )
    else:
        last_email_at = (
            existing_last_email
        )

        gmail_thread_id = (
            existing.get(
                "gmail_thread_id"
            )
        )

        gmail_message_id = (
            existing.get(
                "gmail_message_id"
            )
        )

    existing_applied_at = (
        existing.get(
            "applied_at"
        )
    )

    incoming_applied_at = (
        application.get(
            "applied_at"
        )
    )

    if (
        existing_applied_at
        and incoming_applied_at
    ):
        applied_at = min(
            (
                existing_applied_at,
                incoming_applied_at,
            ),
            key=_parse_date,
        )
    else:
        applied_at = (
            existing_applied_at
            or incoming_applied_at
        )

    payload = {
        "company": company,
        "role": role,
        "applied_at": (
            applied_at
        ),
        "last_email_at": (
            last_email_at
        ),
        "gmail_thread_id": (
            gmail_thread_id
        ),
        "gmail_message_id": (
            gmail_message_id
        ),
        "updated_at": (
            datetime.now(
                timezone.utc
            ).isoformat()
        ),
    }

    if not preserve_manual_status:
        if (
            _parse_date(
                incoming_last_email
            )
            >= _parse_date(
                existing_last_email
            )
        ):
            payload.update(
                {
                    "status": (
                        application[
                            "status"
                        ]
                    ),
                    "status_source": (
                        "email"
                    ),
                }
            )

    return payload


def _has_meaningful_changes(
    *,
    existing: dict[str, Any],
    payload: dict[str, Any],
) -> bool:
    for key, value in (
        payload.items()
    ):
        if key == "updated_at":
            continue

        if (
            existing.get(
                key
            )
            != value
        ):
            return True

    return False


async def _bulk_create_jobs(
    *,
    client: httpx.AsyncClient,
    access_token: str,
    user_id: str,
    applications: list[
        dict[str, Any]
    ],
) -> list[dict[str, Any]]:
    if not applications:
        return []

    payload = [
        {
            **application,
            "user_id": user_id,
        }
        for application
        in applications
    ]

    headers = {
        **_supabase_headers(
            access_token
        ),
        "Prefer": (
            "return=representation"
        ),
    }

    response = await client.post(
        (
            f"{SUPABASE_URL}"
            "/rest/v1/job_applications"
        ),
        headers=headers,
        json=payload,
    )

    response.raise_for_status()

    rows = response.json()

    if not isinstance(
        rows,
        list,
    ):
        raise RuntimeError(
            "Supabase did not return "
            "the created job applications."
        )

    return rows


async def _update_existing_job(
    *,
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    access_token: str,
    existing: dict[str, Any],
    application: dict[str, Any],
) -> dict[str, Any] | None:
    payload = (
        _build_update_payload(
            existing=existing,
            application=application,
        )
    )

    if not _has_meaningful_changes(
        existing=existing,
        payload=payload,
    ):
        return None

    headers = {
        **_supabase_headers(
            access_token
        ),
        "Prefer": (
            "return=representation"
        ),
    }

    async with semaphore:
        response = (
            await client.patch(
                (
                    f"{SUPABASE_URL}"
                    "/rest/v1/"
                    "job_applications"
                ),
                headers=headers,
                params={
                    "id": (
                        f"eq."
                        f"{existing['id']}"
                    ),
                },
                json=payload,
            )
        )

        response.raise_for_status()

        rows = response.json()

    if (
        isinstance(
            rows,
            list,
        )
        and rows
    ):
        return rows[0]

    raise RuntimeError(
        "Supabase did not return "
        "the updated job application."
    )


async def save_job_applications(
    *,
    access_token: str,
    user_id: str,
    applications: list[
        dict[str, Any]
    ],
) -> list[dict[str, Any]]:
    grouped_applications = (
        _group_applications(
            applications
        )
    )

    if not grouped_applications:
        return []

    async with httpx.AsyncClient(
        timeout=25.0
    ) as client:
        existing_jobs = (
            await _get_existing_jobs(
                client=client,
                access_token=(
                    access_token
                ),
                user_id=user_id,
            )
        )

        new_applications: list[
            dict[str, Any]
        ] = []

        updates: list[
            tuple[
                dict[str, Any],
                dict[str, Any],
            ]
        ] = []

        matched_existing_ids: set[
            str
        ] = set()

        for application in (
            grouped_applications
        ):
            existing = (
                _find_existing_match(
                    existing_jobs=(
                        existing_jobs
                    ),
                    application=(
                        application
                    ),
                )
            )

            if (
                existing
                and str(
                    existing.get(
                        "id"
                    )
                )
                not in matched_existing_ids
            ):
                matched_existing_ids.add(
                    str(
                        existing[
                            "id"
                        ]
                    )
                )

                updates.append(
                    (
                        existing,
                        application,
                    )
                )
            else:
                new_applications.append(
                    application
                )

        created_jobs = (
            await _bulk_create_jobs(
                client=client,
                access_token=(
                    access_token
                ),
                user_id=user_id,
                applications=(
                    new_applications
                ),
            )
        )

        semaphore = (
            asyncio.Semaphore(
                MAX_CONCURRENT_SUPABASE_UPDATES
            )
        )

        update_tasks = [
            _update_existing_job(
                client=client,
                semaphore=semaphore,
                access_token=(
                    access_token
                ),
                existing=existing,
                application=application,
            )
            for (
                existing,
                application,
            )
            in updates
        ]

        updated_jobs: list[
            dict[str, Any]
        ] = []

        if update_tasks:
            results = (
                await asyncio.gather(
                    *update_tasks
                )
            )

            updated_jobs = [
                result
                for result
                in results
                if result is not None
            ]

    return [
        *created_jobs,
        *updated_jobs,
    ]