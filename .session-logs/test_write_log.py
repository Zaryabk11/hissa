import json
import tempfile
import unittest
from pathlib import Path

import write_log


class TranscriptParsingTests(unittest.TestCase):
    def test_claude_transcript_keeps_only_user_and_assistant_text(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "claude.jsonl"
            path.write_text(
                "\n".join(
                    [
                        json.dumps(
                            {
                                "type": "user",
                                "timestamp": "2026-11-01T10:00:00Z",
                                "message": {"content": "Please update the page."},
                            }
                        ),
                        json.dumps(
                            {
                                "type": "assistant",
                                "timestamp": "2026-11-01T10:01:00Z",
                                "message": {
                                    "content": [
                                        {"type": "text", "text": "Updated the page."},
                                        {"type": "tool_use", "name": "Read"},
                                    ]
                                },
                            }
                        ),
                        json.dumps(
                            {
                                "type": "assistant",
                                "isSidechain": True,
                                "message": {"content": "Subagent text."},
                            }
                        ),
                    ]
                ),
                encoding="utf-8",
            )

            entries = write_log._claude_entries(path)

        self.assertEqual([("user", "Please update the page."), ("assistant", "Updated the page.")],
                         [(role, content) for _, role, content in entries])

    def test_codex_transcript_extracts_user_and_final_assistant(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "codex.jsonl"
            path.write_text(
                "\n".join(
                    [
                        json.dumps(
                            {
                                "type": "event_msg",
                                "timestamp": "2026-11-01T10:00:00Z",
                                "payload": {"type": "user_message", "message": "Fix the bug."},
                            }
                        ),
                        json.dumps(
                            {
                                "type": "response_item",
                                "timestamp": "2026-11-01T10:01:00Z",
                                "payload": {
                                    "type": "message",
                                    "role": "assistant",
                                    "phase": "analysis",
                                    "content": [{"type": "output_text", "text": "Private reasoning."}],
                                },
                            }
                        ),
                        json.dumps(
                            {
                                "type": "response_item",
                                "timestamp": "2026-11-01T10:02:00Z",
                                "payload": {
                                    "type": "message",
                                    "role": "assistant",
                                    "phase": "final_answer",
                                    "content": [{"type": "output_text", "text": "Fixed the bug."}],
                                },
                            }
                        ),
                    ]
                ),
                encoding="utf-8",
            )

            entries = write_log._codex_entries(path)

        self.assertEqual([("user", "Fix the bug."), ("assistant", "Fixed the bug.")],
                         [(role, content) for _, role, content in entries])

    def test_copilot_transcript_reads_role_content_messages(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "copilot.json"
            path.write_text(
                json.dumps(
                    {
                        "messages": [
                            {"role": "user", "content": "Add a test."},
                            {"type": "assistant.message", "data": {"content": "Added a test."}},
                        ]
                    }
                ),
                encoding="utf-8",
            )

            entries = write_log._generic_entries(path)

        self.assertEqual([("user", "Add a test."), ("assistant", "Added a test.")],
                         [(role, content) for _, role, content in entries])

    def test_copilot_transcript_reads_jsonl_messages(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "copilot.jsonl"
            path.write_text(
                "\n".join(
                    [
                        json.dumps({"role": "user", "content": "Review this change."}),
                        json.dumps({"role": "assistant", "content": "The change looks good."}),
                    ]
                ),
                encoding="utf-8",
            )

            entries = write_log._generic_entries(path)

        self.assertEqual(
            [("user", "Review this change."), ("assistant", "The change looks good.")],
            [(role, content) for _, role, content in entries],
        )


class HookEventTests(unittest.TestCase):
    def test_prompt_then_stop_writes_canonical_markdown_log(self):
        with tempfile.TemporaryDirectory() as temporary:
            cwd = Path(temporary)
            transcript = cwd / "transcript.json"
            transcript.write_text(
                json.dumps(
                    {
                        "messages": [
                            {"role": "user", "content": "Add a regression test."},
                            {"role": "assistant", "content": "Added and ran the test."},
                        ]
                    }
                ),
                encoding="utf-8",
            )
            prompt_event = {
                "hook_event_name": "UserPromptSubmit",
                "session_id": "session-123",
                "timestamp": "2026-11-01T10:00:00Z",
                "cwd": str(cwd),
                "prompt": "Add a regression test.",
            }
            log_path = write_log.process_event(prompt_event, "copilot")
            self.assertIsNotNone(log_path)
            self.assertIn("[CLAUDE_LOG_ENTRY type=PROMPT", log_path.read_text(encoding="utf-8"))

            stop_event = {
                "hook_event_name": "Stop",
                "session_id": "session-123",
                "timestamp": "2026-11-01T10:01:00Z",
                "cwd": str(cwd),
                "transcript_path": str(transcript),
            }
            updated_path = write_log.process_event(stop_event, "copilot")
            output = updated_path.read_text(encoding="utf-8")

            state_path = cwd / ".claude-logs" / ".state" / "copilot_session-123.json"
            end_event = {
                "hook_event_name": "sessionEnd",
                "session_id": "session-123",
                "timestamp": "2026-11-01T10:02:00Z",
                "cwd": str(cwd),
            }
            write_log.process_event(end_event, "copilot")

        self.assertEqual(log_path, updated_path)
        self.assertIn("[CLAUDE_LOG_ENTRY type=RESPONSE", output)
        self.assertIn("Added and ran the test.", output)
        self.assertNotIn(".state", output)
        self.assertFalse(state_path.exists())

    def test_claude_hooks_use_transcript_path_and_keep_the_final_response(self):
        with tempfile.TemporaryDirectory() as temporary:
            cwd = Path(temporary)
            transcript = cwd / "transcript.jsonl"
            transcript.write_text(
                "\n".join(
                    [
                        json.dumps(
                            {
                                "type": "user",
                                "timestamp": "2026-11-01T10:00:00Z",
                                "message": {"content": "Explain the change."},
                            }
                        ),
                        json.dumps(
                            {
                                "type": "assistant",
                                "timestamp": "2026-11-01T10:01:00Z",
                                "message": {"content": [{"type": "text", "text": "The change is complete."}]},
                            }
                        ),
                    ]
                ),
                encoding="utf-8",
            )
            prompt_event = {
                "hook_event_name": "UserPromptSubmit",
                "session_id": "claude-session",
                "timestamp": "2026-11-01T10:00:00Z",
                "cwd": str(cwd),
                "prompt": "Explain the change.",
            }
            write_log.process_event(prompt_event, "claude")
            stop_event = {
                "hook_event_name": "Stop",
                "session_id": "claude-session",
                "timestamp": "2026-11-01T10:01:00Z",
                "cwd": str(cwd),
                "transcript_path": str(transcript),
            }
            log_path = write_log.process_event(stop_event, "claude")
            output = log_path.read_text(encoding="utf-8")

        self.assertIn("The change is complete.", output)
        self.assertIn("session_status: complete", output)


class SpecFormatTests(unittest.TestCase):
    def _event(self, name, cwd, prompt=None, ts="2026-11-06T10:00:00Z"):
        event = {"hook_event_name": name, "session_id": "abc-123", "cwd": str(cwd), "timestamp": ts}
        if prompt:
            event["prompt"] = prompt
        return event

    def test_filename_has_no_agent_and_session_resumes_same_file(self):
        with tempfile.TemporaryDirectory() as temporary:
            cwd = Path(temporary)
            first = write_log.process_event(self._event("UserPromptSubmit", cwd, "hi"), "claude")
            write_log.process_event(self._event("SessionEnd", cwd), "claude")
            second = write_log.process_event(
                self._event("UserPromptSubmit", cwd, "again", "2026-11-06T11:00:00Z"), "claude"
            )
            files = sorted(p.name for p in (cwd / ".claude-logs").glob("*.md"))
        self.assertEqual(first, second)
        self.assertEqual(1, len(files))
        self.assertRegex(files[0], r"^\d{4}-\d\d-\d\d_\d\d-\d\d-\d\d_abc-123\.md$")

    def test_frontmatter_is_unquoted_and_has_prompt_flags(self):
        with tempfile.TemporaryDirectory() as temporary:
            cwd = Path(temporary)
            path = write_log.process_event(self._event("UserPromptSubmit", cwd, "see https://x.io"), "claude")
            text = path.read_text(encoding="utf-8")
        self.assertIn("\nsession_id: abc-123\n", text)
        self.assertNotIn("agent:", text)
        self.assertIn("# Claude Session Log - ", text)
        self.assertIn("has_urls: True", text)
        self.assertIn("time: ", text)


if __name__ == "__main__":
    unittest.main()
