#!/usr/bin/env python3
"""Write prompt-and-response-only logs from local agent lifecycle hooks."""

import json
import os
import re
import subprocess
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


Entry = Tuple[str, str, str]
TEXT_BLOCK_TYPES = {"input_text", "output_text", "text"}


def _event_time(value: Any) -> str:
    if isinstance(value, (int, float)):
        seconds = value / 1000 if value > 10_000_000_000 else value
        return datetime.fromtimestamp(seconds).astimezone().isoformat()
    if isinstance(value, str) and value.strip():
        return value
    return datetime.now().astimezone().isoformat()


def _text_from_content(content: Any) -> Optional[str]:
    if isinstance(content, str):
        return content.strip() or None
    if isinstance(content, dict):
        return _text_from_content(content.get("content", content.get("text")))
    if isinstance(content, list):
        parts = [
            item.get("text", "").strip()
            for item in content
            if isinstance(item, dict)
            and item.get("type") in TEXT_BLOCK_TYPES
            and isinstance(item.get("text"), str)
        ]
        text = "\n\n".join(part for part in parts if part)
        return text or None
    return None


def _claude_entries(path: Path) -> List[Entry]:
    entries: List[Entry] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(record, dict) or record.get("isSidechain") or record.get("isMeta"):
            continue
        role = record.get("type")
        if role not in {"user", "assistant"}:
            continue
        message = record.get("message")
        if not isinstance(message, dict):
            continue
        content = message.get("content", "")
        if role == "user" and isinstance(content, list):
            if any(isinstance(block, dict) and block.get("type") == "tool_result" for block in content):
                continue
            continue
        text = _text_from_content(content)
        if text and not text.startswith(("<command-name>", "<local-command", "Caveat:")):
            entries.append((_event_time(record.get("timestamp")), role, text))
    return _final_entries(entries)


def _codex_entries(path: Path) -> List[Entry]:
    entries: List[Entry] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(record, dict):
            continue
        payload = record.get("payload")
        if not isinstance(payload, dict):
            payload = record

        record_type = record.get("type")
        payload_type = payload.get("type")
        role: Optional[str] = None
        content: Any = None

        if record_type == "event_msg" and payload_type == "user_message":
            role = "user"
            content = payload.get("message")
        elif record_type == "event_msg" and payload_type == "agent_message":
            role = "assistant"
            content = payload.get("message")
        elif record_type == "response_item" and payload_type == "message":
            role = payload.get("role")
            phase = payload.get("phase")
            if phase and phase != "final_answer":
                continue
            content = payload.get("content")
        elif payload_type in {"user_message", "agent_message"}:
            role = "user" if payload_type == "user_message" else "assistant"
            content = payload.get("message")
        else:
            role = payload.get("role")
            content = payload.get("content")

        if role not in {"user", "assistant"}:
            continue
        text = _text_from_content(content)
        if text:
            entries.append((_event_time(record.get("timestamp")), role, text))
    return _final_entries(entries)


def _generic_entries(path: Path) -> List[Entry]:
    raw = path.read_text(encoding="utf-8")
    try:
        decoded = json.loads(raw)
        records: Iterable[Any]
        if isinstance(decoded, list):
            records = decoded
        elif isinstance(decoded, dict):
            nested = decoded.get("messages", decoded.get("transcript"))
            records = nested if isinstance(nested, list) else [decoded]
        else:
            records = []
    except json.JSONDecodeError:
        records = []
        for line in raw.splitlines():
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            records.append(record)

    entries: List[Entry] = []
    for record in records:
        if not isinstance(record, dict) or record.get("isSidechain") or record.get("isMeta"):
            continue
        containers = [record]
        for key in ("message", "payload", "data"):
            nested = record.get(key)
            if isinstance(nested, dict):
                containers.append(nested)

        role: Optional[str] = None
        content: Any = None
        for item in containers:
            candidate_role = item.get("role")
            item_type = item.get("type")
            if candidate_role in {"user", "assistant"}:
                role = candidate_role
            elif item_type in {"user", "assistant"}:
                role = item_type
            elif item_type in {"user_message", "agent_message"}:
                role = "user" if item_type == "user_message" else "assistant"
            elif isinstance(item_type, str) and item_type.split(".", 1)[0] in {"user", "assistant"}:
                role = item_type.split(".", 1)[0]
            candidate_content = item.get("content", item.get("text", item.get("message")))
            if candidate_content is not None:
                content = candidate_content
            if role and content is not None:
                break
        if role not in {"user", "assistant"}:
            continue
        text = _text_from_content(content)
        if text:
            entries.append((_event_time(record.get("timestamp")), role, text))
    return _final_entries(entries)


def _final_entries(entries: List[Entry]) -> List[Entry]:
    result: List[Entry] = []
    pending_assistant: Optional[Entry] = None
    for entry in entries:
        if entry[1] == "user":
            if pending_assistant:
                result.append(pending_assistant)
                pending_assistant = None
            result.append(entry)
        else:
            pending_assistant = entry
    if pending_assistant:
        result.append(pending_assistant)
    return result


def _read_transcript(path_value: Any, platform: str) -> List[Entry]:
    if not isinstance(path_value, str) or not path_value:
        return []
    path = Path(path_value).expanduser()
    if not path.is_file():
        return []
    if platform == "claude":
        return _claude_entries(path)
    if platform == "codex":
        return _codex_entries(path)
    return _generic_entries(path)


def _git_value(cwd: Path, key: str) -> str:
    try:
        result = subprocess.run(
            ["git", "config", key],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return "unknown"
    return result.stdout.strip() if result.returncode == 0 and result.stdout.strip() else "unknown"


def _yaml_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=True)


def _render(state: Dict[str, Any]) -> str:
    entries: List[Entry] = [
        (entry["timestamp"], entry["role"], entry["content"])
        for entry in state["entries"]
    ]
    prompts = [entry for entry in entries if entry[1] == "user"]
    responses = [entry for entry in entries if entry[1] == "assistant"]
    last_role = entries[-1][1] if entries else "unknown"
    status = "complete" if last_role == "assistant" else "awaiting_response"
    session_id = state["session_id"]
    day = state["created_at"][:10]
    lines = [
        "---",
        f"session_id: {_yaml_string(session_id)}",
        f"agent: {_yaml_string(state['agent'])}",
        f"date: {_yaml_string(day)}",
        f"author: {_yaml_string(state['author'])}",
        f"github_user: {_yaml_string(os.environ.get('GITHUB_USER', 'unknown'))}",
        f"git_email: {_yaml_string(state['git_email'])}",
        f"project: {_yaml_string(state['project'])}",
        f"session_status: {status}",
        f"last_entry_type: {last_role}",
        f"total_exchanges: {len(prompts)}",
        f"total_prompt_words: {sum(len(entry[2].split()) for entry in prompts)}",
        f"total_response_chars: {sum(len(entry[2]) for entry in responses)}",
        f"generated_at: {_yaml_string(datetime.now().astimezone().isoformat())}",
        "---",
        "",
        f"# Agent Session Log - {day}",
        "",
        f"Session: `{session_id}` | Agent: `{state['agent']}` | Project: `{state['project']}` | Author: `{state['author']}`",
        "",
        "---",
        "",
    ]
    exchange = 0
    for timestamp, role, content in entries:
        if role == "user":
            exchange += 1
            entry_type = "PROMPT"
        else:
            entry_type = "RESPONSE"
        lines.extend(
            [
                f"[CLAUDE_LOG_ENTRY type={entry_type} num={exchange} session={session_id}]",
                f"timestamp: {timestamp}",
                f"chars: {len(content)}",
                "",
                content,
                "",
            ]
        )
    return "\n".join(lines)


def _safe_id(value: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]", "-", value)
    return safe.strip(".-") or "unknown"


def _atomic_write(path: Path, content: str) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(content, encoding="utf-8")
    temporary.replace(path)


def process_event(event: Dict[str, Any], platform: str) -> Optional[Path]:
    event_name = str(event.get("hook_event_name", event.get("event", ""))).lower()
    if event_name in {"userpromptsubmit", "user_prompt_submit"}:
        action = "prompt"
    elif event_name in {"stop", "agentstop"}:
        action = "stop"
    elif event_name == "sessionend":
        action = "session_end"
    else:
        return None

    session_id = event.get("session_id", event.get("sessionId"))
    cwd_value = event.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    if not isinstance(session_id, str) or not session_id.strip():
        raise ValueError("Hook event is missing its session ID.")
    if not isinstance(cwd_value, str):
        raise ValueError("Hook event has an invalid working directory.")
    cwd = Path(cwd_value).expanduser().resolve()
    if not cwd.is_dir():
        raise ValueError(f"Hook working directory does not exist: {cwd}")

    output_dir = cwd / ".claude-logs"
    state_dir = output_dir / ".state"
    safe_session_id = _safe_id(session_id)
    state_path = state_dir / f"{platform}_{safe_session_id}.json"
    if action == "session_end":
        state_path.unlink(missing_ok=True)
        return None
    state_dir.mkdir(parents=True, exist_ok=True)

    if state_path.exists():
        state = json.loads(state_path.read_text(encoding="utf-8"))
    else:
        created_at = _event_time(event.get("timestamp"))
        state = {
            "session_id": session_id,
            "agent": platform,
            "created_at": created_at,
            "project": cwd.name,
            "author": _git_value(cwd, "user.name"),
            "git_email": _git_value(cwd, "user.email"),
            "entries": [],
        }

    timestamp = _event_time(event.get("timestamp"))
    if action == "prompt":
        prompt = event.get("prompt")
        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError("Prompt-submit event is missing its prompt text.")
        prompt = prompt.strip()
        if not any(
            item["role"] == "user" and item["timestamp"] == timestamp and item["content"] == prompt
            for item in state["entries"]
        ):
            state["entries"].append({"timestamp": timestamp, "role": "user", "content": prompt})
    else:
        transcript_entries = _read_transcript(
            event.get("transcript_path", event.get("transcriptPath")),
            platform,
        )
        if transcript_entries:
            parsed_prompts = Counter(entry[2] for entry in transcript_entries if entry[1] == "user")
            state_prompts = Counter(
                item["content"] for item in state["entries"] if item["role"] == "user"
            )
            for item in state["entries"]:
                if item["role"] == "user" and state_prompts[item["content"]] > parsed_prompts[item["content"]]:
                    transcript_entries.append((item["timestamp"], item["role"], item["content"]))
                    parsed_prompts[item["content"]] += 1
            state["entries"] = [
                {"timestamp": ts, "role": role, "content": content}
                for ts, role, content in _final_entries(transcript_entries)
            ]
        else:
            response = event.get(
                "last_assistant_message",
                event.get("lastAssistantMessage", event.get("response")),
            )
            if isinstance(response, str) and response.strip():
                state["entries"].append(
                    {"timestamp": timestamp, "role": "assistant", "content": response.strip()}
                )
            elif not any(item["role"] == "assistant" for item in state["entries"]):
                print(
                    f"Session log warning: no readable assistant transcript for {platform} session {session_id}.",
                    file=sys.stderr,
                )

    stamp = datetime.fromisoformat(state["created_at"].replace("Z", "+00:00"))
    filename = f"{stamp.strftime('%Y-%m-%d_%H-%M-%S')}_{platform}_{safe_session_id}.md"
    log_path = output_dir / filename
    _atomic_write(state_path, json.dumps(state, ensure_ascii=False, indent=2) + "\n")
    _atomic_write(log_path, _render(state))
    return log_path


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in {"claude", "codex", "copilot"}:
        print("Usage: write_log.py {claude|codex|copilot}", file=sys.stderr)
        return 2
    try:
        event = json.load(sys.stdin)
        if not isinstance(event, dict):
            raise ValueError("Hook input must be a JSON object.")
        process_event(event, sys.argv[1])
    except (json.JSONDecodeError, OSError, ValueError, KeyError) as error:
        print(f"Session log warning: {error}", file=sys.stderr)
    sys.stdout.write("{}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
