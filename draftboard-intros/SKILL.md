---
name: draftboard-intros
description: Use when the user wants warm introductions, intro paths, or network-based outreach to a person or company — discovering who can introduce them to a prospect, checking if they're already connected to someone, finding their best intro opportunities, tracking intro progress, or writing outreach that name-drops mutual connections. Triggers include "warm intro", "who can introduce me to", "am I connected to", "best paths", "intro opportunities", "namedrop mutual connection", and any work against Draftboard targets/connections. Requires the @draftboard/mcp server.
---

# Draftboard intros

Help the user get **warm introductions** using their Draftboard network data, via the
`@draftboard/mcp` server. Draftboard's core idea is **relationship proximity**: the shortest path
from the user to a prospect (a **target**) runs through a mutual **connection** (a **connector**),
scored 0–100 by **rank**.

## Before anything else

1. Confirm the MCP server is available. If its tools are missing, point the user to
   `references/setup.md` (install `@draftboard/mcp`, set `DRAFTBOARD_API_KEY`).
2. Call **`get_me`** once to confirm whose account this is (`customer.name` / `customer.user`).
   Team-member ids for "through my teammate" requests (`ownerIds`) are **not** in `get_me` — they
   come from the `owners[].id` on connections (e.g. from `find_top_paths` output or
   `get_target_connections`).
3. **Never** print or ask the user to paste their API key in chat; it lives in the MCP env block.

## Pick the right tool

Prefer the **outcome tools** — they do the multi-step work and return a `telemetry` block so you
know how complete the answer is. Drop to **thin tools** only when no outcome tool fits.

| User wants… | Use |
|-------------|-----|
| Best intro opportunities right now | `find_top_paths` |
| Paths through a specific teammate's network | `find_top_paths` with `ownerIds` |
| Whether they're already connected to people (by LinkedIn URL) | `check_if_connected` |
| Progress of intros (new / completed / stopped) | `intro_status_overview` |
| Cold email that name-drops a mutual connection | `find_top_paths` (`includeRankDetails: true`), use `rankDetails` |
| Raw target / connection / tag data | `list_targets`, `get_target_connections`, `list_tags` |
| Add new people to track | `import_targets` |

The full 12-pain playbook — including the jobs the Integration API does **not** yet support and the
closest workarounds — is in `references/user-stories.md`. The tool catalog with arguments is in
`references/tools.md`.

## How to work

- **Scope expensive tools.** `find_top_paths` walks each target's connections. Always narrow with
  `tagNames`, `statuses`, `minTargetMaxRank`, or `ownerIds` before running on a big account. If the
  returned `telemetry.truncated` is true, tell the user the result is partial and follow
  `telemetry.nextSuggestedFilter`.
- **Be honest about coverage.** Always surface counts from `telemetry` (e.g. "scanned the top 25 of
  142 targets"). Never imply you searched everything when you didn't.
- **Connector by name (e.g. "paths through Jane Smith").** The API filters connections by team
  member (`ownerIds`), not by connector name. Run `find_top_paths`, then filter the opportunities
  client-side on the `connector` field, and say you did.
- **Newly imported people need time.** After `import_targets` / `check_if_connected`, enrichment and
  path scoring are asynchronous — if a person shows `isTarget: false` or `hasPaths: false`
  immediately, tell the user to re-check shortly rather than concluding there's no path.
- **Name-drop responsibly.** Use a connector's `rankDetails` (shared history) for the warm line, but
  only mention real, returned facts — never invent a shared connection.

## Output

Lead with the answer (the top opportunities, the yes/no, the status numbers), then the supporting
detail. For each intro opportunity, name the **connector**, the **target**, the **rank**, and the
**reason** (`rankDetails`). Keep it skimmable.
