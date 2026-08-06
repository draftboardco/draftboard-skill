# Draftboard intros — Codex / AGENTS pointer

This folder ships a real skill: **[`SKILL.md`](./SKILL.md)** — the same format Codex and Claude both
load. Install it as a skill rather than relying on this file:

- **Codex CLI:** copy this `draftboard-intros/` folder into `~/.codex/skills/` (or a repo-scoped
  skills dir). Codex loads `SKILL.md` on demand from its frontmatter — nothing needs to be pasted here.
- **Claude:** copy it into `~/.claude/skills/`.

`SKILL.md` is the single source of truth for how to drive the `@draftboard/mcp` tools (warm intros,
paths, targets, connections). Setup — including the Codex `codex mcp add` / `config.toml` steps — is in
[`references/setup.md`](./references/setup.md).

If you use always-on `AGENTS.md` project guidance instead of skills, read `SKILL.md` in this folder and
follow it verbatim. Its rules apply unchanged on Codex: scope expensive scans before running them,
report coverage from the `telemetry` block, name-drop only real `rankDetails` (the connector↔target
history, never the user's), confirm the irreversible `archive_target` before calling it, and stay
inside the sanctioned tools.
