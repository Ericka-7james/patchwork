from __future__ import annotations

import asyncio
import base64
from datetime import datetime, timezone
from typing import Any

import httpx


GMAIL_API_BASE_URL = (
    "https://gmail.googleapis.com/gmail/v1"
)

MAX_JOB_MESSAGES = 50

MAX_CONCURRENT_METADATA_FETCHES = 12
MAX_CONCURRENT_FULL_FETCHES = 6

MAX_FULL_MESSAGE_FETCHES = 15


JOB_EMAIL_QUERY = (
    "newer_than:3m "
    "-in:sent "
    "{"
    'subject:"application received" '
    'subject:"application was received" '
    'subject:"received your application" '
    'subject:"received your job application" '
    'subject:"received your resume" '
    'subject:"thank you for applying" '
    'subject:"thanks for applying" '
    'subject:"application update" '
    'subject:"status update" '
    'subject:"your application" '
    'subject:"application was sent" '
    'subject:"job application" '
    'subject:"application status" '
    'subject:"application is under review" '
    'subject:"application is complete" '
    'subject:"application is under consideration" '
    "subject:interview "
    'subject:"interview invitation" '
    'subject:"phone screen" '
    'subject:"next steps" '
    'subject:"next step" '
    'subject:"technical assessment" '
    'subject:"candidate reference"'
    "}"
)


GENERIC_SUBJECTS = (
    "application received",
    "application update",
    "status update",
    "job application update",
    "thank you for your application",
    "thank you for applying",
    "needs review",
    "next steps",
    "next step",
)


def _decode_base64url(
    value: str | None,
) -> str:
    if not value:
        return ""

    padding = "=" * (
        (4 - len(value) % 4) % 4
    )

    try:
        decoded = (
            base64.urlsafe_b64decode(
                f"{value}{padding}"
            )
        )

        return decoded.decode(
            "utf-8",
            errors="replace",
        )
    except (
        ValueError,
        UnicodeDecodeError,
    ):
        return ""


def _extract_payload_text(
    payload: dict[str, Any] | None,
) -> str:
    if not isinstance(
        payload,
        dict,
    ):
        return ""

    mime_type = payload.get(
        "mimeType",
        "",
    )

    body = payload.get(
        "body",
        {},
    )

    if (
        mime_type
        in {
            "text/plain",
            "text/html",
        }
        and isinstance(
            body,
            dict,
        )
    ):
        text = _decode_base64url(
            body.get(
                "data"
            )
        )

        if text:
            return text

    parts = payload.get(
        "parts",
        [],
    )

    if not isinstance(
        parts,
        list,
    ):
        return ""

    plain_parts: list[str] = []
    html_parts: list[str] = []

    for part in parts:
        if not isinstance(
            part,
            dict,
        ):
            continue

        part_type = part.get(
            "mimeType",
            "",
        )

        part_text = (
            _extract_payload_text(
                part
            )
        )

        if not part_text:
            continue

        if (
            part_type
            == "text/plain"
        ):
            plain_parts.append(
                part_text
            )

        elif (
            part_type
            == "text/html"
        ):
            html_parts.append(
                part_text
            )

        else:
            plain_parts.append(
                part_text
            )

    if plain_parts:
        return "\n".join(
            plain_parts
        )

    return "\n".join(
        html_parts
    )


def _get_headers(
    payload: dict[str, Any] | None,
) -> dict[str, str]:
    if not isinstance(
        payload,
        dict,
    ):
        return {}

    headers = payload.get(
        "headers",
        [],
    )

    if not isinstance(
        headers,
        list,
    ):
        return {}

    normalized_headers: dict[
        str,
        str,
    ] = {}

    for header in headers:
        if not isinstance(
            header,
            dict,
        ):
            continue

        name = header.get(
            "name"
        )

        value = header.get(
            "value"
        )

        if (
            isinstance(
                name,
                str,
            )
            and isinstance(
                value,
                str,
            )
        ):
            normalized_headers[
                name.lower()
            ] = value

    return normalized_headers


def _internal_date_to_iso(
    internal_date: str | None,
) -> str | None:
    if not internal_date:
        return None

    try:
        timestamp = (
            int(internal_date)
            / 1000
        )

        return (
            datetime.fromtimestamp(
                timestamp,
                tz=timezone.utc,
            ).isoformat()
        )

    except (
        TypeError,
        ValueError,
        OverflowError,
    ):
        return None


def _message_to_dict(
    message: dict[str, Any],
    *,
    include_body: bool,
) -> dict[str, Any]:
    payload = message.get(
        "payload",
        {},
    )

    headers = _get_headers(
        payload
    )

    body = ""

    if include_body:
        body = (
            _extract_payload_text(
                payload
            )
        )

    return {
        "id": message.get(
            "id"
        ),
        "thread_id": message.get(
            "threadId"
        ),
        "subject": headers.get(
            "subject",
            "",
        ),
        "from": headers.get(
            "from",
            "",
        ),
        "to": headers.get(
            "to",
            "",
        ),
        "date": (
            _internal_date_to_iso(
                message.get(
                    "internalDate"
                )
            )
        ),
        "snippet": message.get(
            "snippet",
            "",
        ),
        "body": body,
    }


def _needs_full_body(
    message: dict[str, Any],
) -> bool:
    subject = str(
        message.get(
            "subject",
            "",
        )
    ).strip().lower()

    if not subject:
        return True

    if len(subject) < 18:
        return True

    return any(
        subject == generic_subject
        or subject.startswith(
            f"{generic_subject} "
        )
        for generic_subject
        in GENERIC_SUBJECTS
    )


async def _list_message_refs(
    google_access_token: str,
) -> list[dict[str, str]]:
    headers = {
        "Authorization": (
            f"Bearer "
            f"{google_access_token}"
        ),
    }

    params = {
        "q": JOB_EMAIL_QUERY,
        "maxResults": (
            MAX_JOB_MESSAGES
        ),
    }

    async with httpx.AsyncClient(
        timeout=20.0
    ) as client:
        response = (
            await client.get(
                (
                    f"{GMAIL_API_BASE_URL}"
                    "/users/me/messages"
                ),
                headers=headers,
                params=params,
            )
        )

        response.raise_for_status()

        payload = (
            response.json()
        )

    messages = payload.get(
        "messages",
        [],
    )

    if not isinstance(
        messages,
        list,
    ):
        return []

    return [
        message
        for message in messages
        if isinstance(
            message,
            dict,
        )
    ][
        :MAX_JOB_MESSAGES
    ]


async def _get_message_metadata(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    google_access_token: str,
    message_id: str,
) -> dict[str, Any]:
    async with semaphore:
        response = await client.get(
            (
                f"{GMAIL_API_BASE_URL}"
                "/users/me/messages/"
                f"{message_id}"
            ),
            headers={
                "Authorization": (
                    f"Bearer "
                    f"{google_access_token}"
                ),
            },
            params=[
                (
                    "format",
                    "metadata",
                ),
                (
                    "metadataHeaders",
                    "Subject",
                ),
                (
                    "metadataHeaders",
                    "From",
                ),
                (
                    "metadataHeaders",
                    "To",
                ),
            ],
        )

        response.raise_for_status()

        return response.json()


async def _get_full_message(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    google_access_token: str,
    message_id: str,
) -> dict[str, Any]:
    async with semaphore:
        response = await client.get(
            (
                f"{GMAIL_API_BASE_URL}"
                "/users/me/messages/"
                f"{message_id}"
            ),
            headers={
                "Authorization": (
                    f"Bearer "
                    f"{google_access_token}"
                ),
            },
            params={
                "format": "full",
            },
        )

        response.raise_for_status()

        return response.json()


async def fetch_job_messages(
    google_access_token: str,
) -> list[dict[str, Any]]:
    message_refs = (
        await _list_message_refs(
            google_access_token
        )
    )

    if not message_refs:
        return []

    metadata_semaphore = (
        asyncio.Semaphore(
            MAX_CONCURRENT_METADATA_FETCHES
        )
    )

    async with httpx.AsyncClient(
        timeout=20.0
    ) as client:
        metadata_tasks = []

        for message_ref in (
            message_refs
        ):
            message_id = (
                message_ref.get(
                    "id"
                )
            )

            if not message_id:
                continue

            metadata_tasks.append(
                _get_message_metadata(
                    client,
                    metadata_semaphore,
                    google_access_token,
                    message_id,
                )
            )

        raw_metadata = (
            await asyncio.gather(
                *metadata_tasks
            )
        )

        messages = [
            _message_to_dict(
                message,
                include_body=False,
            )
            for message
            in raw_metadata
        ]

        messages_needing_body = [
            message
            for message in messages
            if _needs_full_body(
                message
            )
        ][
            :MAX_FULL_MESSAGE_FETCHES
        ]

        if not messages_needing_body:
            return messages

        full_semaphore = (
            asyncio.Semaphore(
                MAX_CONCURRENT_FULL_FETCHES
            )
        )

        full_tasks = [
            _get_full_message(
                client,
                full_semaphore,
                google_access_token,
                str(
                    message["id"]
                ),
            )
            for message
            in messages_needing_body
            if message.get(
                "id"
            )
        ]

        raw_full_messages = (
            await asyncio.gather(
                *full_tasks
            )
        )

    full_by_id = {
        message.get(
            "id"
        ): _message_to_dict(
            message,
            include_body=True,
        )
        for message
        in raw_full_messages
        if message.get(
            "id"
        )
    }

    return [
        full_by_id.get(
            message.get(
                "id"
            ),
            message,
        )
        for message in messages
    ]