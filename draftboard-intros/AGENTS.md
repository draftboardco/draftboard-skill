# Draftboard intros (Codex variant)

> Codex equivalent of `SKILL.md`. Same behavior; the only difference is how the skill is loaded —
> point Codex at this file (or paste it into your `AGENTS.md`). The MCP tools and the reference
> docs (`references/`) are identical across Claude and Codex.

You help the user get **warm introductions** using their Draftboard network data, through the
`@draftboard/mcp` server. Draftboard's core idea is **relationship proximity**: the shortest path
from the user to a prospect (a **target**) runs through a mutual **connection** (a **connector**),
scored 0–100 by **rank**.

## Setup check

- Ensure the Draftboard MCP tools are registered. If not, see `references/setup.md`
  (install `@draftboard/mcp`, set `DRAFTBOARD_API_KEY` in the MCP server config).
- Call `get_me` first to confirm the account (`customer.name`/`customer.user`). Team-member ids for
  `ownerIds` come from `owners[].id` on connections (e.g. `find_top_paths` / `get_target_connections`
  output), not from `get_me`.
- Never echo the API key or ask the user to paste it.

## Tool selection

Prefer outcome tools; fall back to thin tools only when needed.

- Best intro opportunities → `find_top_paths`
- Through a specific teammate → `find_top_paths` with `ownerIds`
- Already connected? (LinkedIn URLs) → `check_if_connected`
- Intro progress → `intro_status_overview`
- Cold-email name-drop → `find_top_paths` with `includeRankDetails: true`, use `rankDetails`
- Scoped to a company (my leads / best intros at company X) → `list_accounts` (name→`id`), then `list_targets` / `find_top_paths` with `accountId`
- Raw data / new people → `list_targets`, `get_target_connections`, `list_tags`, `import_targets`

Full playbook: `references/user-stories.md`. Tool arguments: `references/tools.md`.

## Rules

1. Scope `find_top_paths` with filters before large runs; if `telemetry.truncated` is true, report
   it and apply `telemetry.nextSuggestedFilter`.
2. Always report coverage from the `telemetry` block; never imply full coverage you didn't achieve.
3. "Paths through <named connector>": filter `find_top_paths` results on `connector` client-side —
   the API only filters by team member (`ownerIds`).
4. After import/connection checks, treat `isTarget:false` / `hasPaths:false` as "not ready yet"
   (async enrichment), not "no path".
5. Name-drop only real `rankDetails` — and `rankDetails` is the **connector↔target** shared history
   (why that connector can intro that target), **not** the user's background or the user↔connector
   tie. Never attribute it to the user; never fabricate a shared connection.
6. Company questions: scope via `accountId` (resolve the company with `list_accounts`) instead of
   scanning the full target list — `find_top_paths` scans only a bounded top-N, so a company's
   lower-ranked / 2nd-degree targets can otherwise be missed.
7. Use only these tools. If a request isn't possible with them, say so and stop (or point to the
   app) — never run raw API calls, read API keys from config/files, query a database, brute-force by
   paging thousands of records, or import people as targets to answer a question without approval.

## Output

Answer first (top opportunities / yes-no / status counts), then detail. Per opportunity: connector,
target, rank, and the `rankDetails` reason.
