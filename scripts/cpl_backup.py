#!/usr/bin/env python3
"""Create a full CPL research-data backup and store it in Google Drive.

Required environment variables:
  SUPABASE_URL
  SUPABASE_SECRET_KEY
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REFRESH_TOKEN

Optional:
  CPL_BACKUP_FOLDER_ID
  CPL_BACKUP_RETENTION (default: 12)

The Drive scope is intentionally limited to drive.file. The script creates and
manages only its own CPL backup files/folder.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_DRIVE_URL = "https://www.googleapis.com/drive/v3"
DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"
BACKUP_FOLDER_NAME = "CPL_BACKUP"
BACKUP_PREFIX = "CPL_BACKUP_"
DEFAULT_RETENTION = 12
PAGE_SIZE = 1000


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def http_json(url: str, *, method: str = "GET", headers: dict | None = None,
              body: bytes | None = None) -> dict | list:
    request = urllib.request.Request(url, data=body, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read()
            if not raw:
                return {}
            return json.loads(raw.decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} from {url}: {detail[:1000]}") from exc


def refresh_google_access_token(client_id: str, client_secret: str, refresh_token: str) -> str:
    payload = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
    ).encode("utf-8")
    response = http_json(
        GOOGLE_TOKEN_URL,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=payload,
    )
    token = str(response.get("access_token", ""))
    if not token:
        raise RuntimeError("Google OAuth refresh did not return an access token.")
    return token


def supabase_rows(supabase_url: str, secret_key: str, table: str) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        params = urllib.parse.urlencode(
            {"select": "*", "limit": PAGE_SIZE, "offset": offset}
        )
        url = f"{supabase_url}/rest/v1/{table}?{params}"
        result = http_json(
            url,
            headers={
                "apikey": secret_key,
                "Authorization": f"Bearer {secret_key}",
            },
        )
        if not isinstance(result, list):
            raise RuntimeError(f"Unexpected Supabase response for {table}.")
        rows.extend(result)
        if len(result) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows


def drive_request(access_token: str, path: str, *, method: str = "GET",
                  params: dict | None = None, body: bytes | None = None,
                  content_type: str | None = None) -> dict | list:
    query = urllib.parse.urlencode(params or {})
    url = f"{GOOGLE_DRIVE_URL}{path}"
    if query:
        url += f"?{query}"
    headers = {"Authorization": f"Bearer {access_token}"}
    if content_type:
        headers["Content-Type"] = content_type
    return http_json(url, method=method, headers=headers, body=body)


def find_or_create_backup_folder(access_token: str) -> str:
    query = (
        f"name = '{BACKUP_FOLDER_NAME}' and "
        "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    )
    result = drive_request(
        access_token,
        "/files",
        params={"q": query, "spaces": "drive", "fields": "files(id,name)", "pageSize": 10},
    )
    files = result.get("files", []) if isinstance(result, dict) else []
    if files:
        return files[0]["id"]

    metadata = json.dumps(
        {
            "name": BACKUP_FOLDER_NAME,
            "mimeType": "application/vnd.google-apps.folder",
        }
    ).encode("utf-8")
    created = drive_request(
        access_token,
        "/files",
        method="POST",
        params={"fields": "id,name"},
        body=metadata,
        content_type="application/json",
    )
    return str(created["id"])


def upload_backup(access_token: str, folder_id: str, filename: str, content: bytes) -> str:
    boundary = "cpl_backup_boundary_7f9a2c"
    metadata = json.dumps(
        {
            "name": filename,
            "parents": [folder_id],
            "mimeType": "application/json",
        },
        separators=(",", ":"),
    ).encode("utf-8")
    multipart = (
        b"--" + boundary.encode() + b"\r\n"
        b"Content-Type: application/json; charset=UTF-8\r\n\r\n"
        + metadata
        + b"\r\n--"
        + boundary.encode()
        + b"\r\n"
        b"Content-Type: application/json\r\n\r\n"
        + content
        + b"\r\n--"
        + boundary.encode()
        + b"--\r\n"
    )
    result = drive_request(
        access_token,
        "/files",
        method="POST",
        params={"uploadType": "multipart", "fields": "id,name"},
        body=multipart,
        content_type=f"multipart/related; boundary={boundary}",
    )
    return str(result["id"])


def prune_backups(access_token: str, folder_id: str, retention: int) -> int:
    query = (
        f"'{folder_id}' in parents and trashed = false and "
        f"name contains '{BACKUP_PREFIX}'"
    )
    result = drive_request(
        access_token,
        "/files",
        params={
            "q": query,
            "spaces": "drive",
            "orderBy": "createdTime desc",
            "pageSize": 100,
            "fields": "files(id,name,createdTime)",
        },
    )
    files = result.get("files", []) if isinstance(result, dict) else []
    removed = 0
    for item in files[retention:]:
        drive_request(access_token, f"/files/{item['id']}", method="DELETE")
        removed += 1
    return removed


def main() -> None:
    supabase_url = require_env("SUPABASE_URL").rstrip("/")
    supabase_secret = require_env("SUPABASE_SECRET_KEY")
    client_id = require_env("GOOGLE_CLIENT_ID")
    client_secret = require_env("GOOGLE_CLIENT_SECRET")
    refresh_token = require_env("GOOGLE_REFRESH_TOKEN")

    retention = int(os.environ.get("CPL_BACKUP_RETENTION", str(DEFAULT_RETENTION)))
    if retention < 1:
        raise RuntimeError("CPL_BACKUP_RETENTION must be at least 1.")

    created_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")

    races = supabase_rows(supabase_url, supabase_secret, "races")
    race_results = supabase_rows(supabase_url, supabase_secret, "race_results")

    backup = {
        "backup_version": 1,
        "created_at": created_at,
        "source": "Supabase",
        "tables": {
            "races": races,
            "race_results": race_results,
        },
    }
    content = json.dumps(backup, ensure_ascii=False, indent=2).encode("utf-8")
    filename = f"{BACKUP_PREFIX}{stamp}.json"

    access_token = refresh_google_access_token(client_id, client_secret, refresh_token)
    folder_id = os.environ.get("CPL_BACKUP_FOLDER_ID", "").strip()
    if not folder_id:
        folder_id = find_or_create_backup_folder(access_token)

    file_id = upload_backup(access_token, folder_id, filename, content)
    removed = prune_backups(access_token, folder_id, retention)

    print(f"CPL backup completed: {filename}")
    print(f"Races: {len(races)}")
    print(f"Race results: {len(race_results)}")
    print(f"Drive file id: {file_id}")
    print(f"Old backups removed: {removed}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"CPL backup failed: {exc}", file=sys.stderr)
        raise
