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
   `references/setup.md` (install `github:draftboardco/mcp`, set `DRAFTBOARD_API_KEY`).
2. Call **`get_me`** once to confirm whose account this is (`customer.name` / `customer.user`). For
   "through my teammate" requests, the team roster is here too: match the teammate's name in
   `customer.teamMembers[]` and pass their `id` as `ownerIds`.
3. **Never** print or ask the user to paste their API key in chat; it lives in the MCP env block.

## Pick the right tool

Prefer the **outcome tools** — they do the multi-step work and return a `telemetry` block so you
know how complete the answer is. Drop to **thin tools** only when no outcome tool fits.

| User wants… | Use |
|-------------|-----|
| Best intro opportunities right now | `find_top_paths` |
| Paths through a specific teammate's network | `find_top_paths` with `ownerIds` |
| Whether ONE named person is already a target (and their `targetId`) | `resolve_target` — one lookup, never a page walk |
| Whether they're already connected to people (by LinkedIn URL) | `check_if_connected` (a batch of URLs) |
| Progress of intros (new / completed / stopped) | `intro_status_overview` |
| Cold email that name-drops a mutual connection | `find_top_paths` (`includeRankDetails: true`), use `rankDetails` |
| Who can a specific connector introduce me to? | `get_connector_intros` (connector-first) |
| **Star / rate a connection** ("star this person", "mark them as a go-to", "rate them 5") | `set_connector_tier` with **`rating` 1–5, higher is better** (5 = ★★★★★ "ask anytime", 1 = ★ "don't ask" — which also hides them; `tier: 0` clears) |
| **List my starred / closest connections** ("who did I rate 5", "my go-tos") | `list_supporters` with **`ratings: [5]`** (or `[4,5]`) |
| Hide connections I'd never ask | `set_connector_tier` with `rating: 1` — a rating of 1 hides them |
| List the ones I already hid | `list_supporters` with `ratings: [1]` — the rating filter *is* the "Hidden" scope; the default listing omits them |
| How do these two know each other? (connector ↔ target) | `get_target_connections` / `get_connector_intros` / `find_top_paths` — read `relationships` + `relationshipDetails`, and fall back to `scoreDetails` |
| Account-level view (companies with targets) | `list_accounts` |
| My saved leads at a specific company | `list_accounts` (name→`id`), then `list_targets` with `accountId` |
| My saved leads with a specific title/role | `list_targets` with `title` (a title/position substring; optionally + `accountId`) |
| Best intros to my targets at a specific company | `list_accounts` (name→`id`), then `find_top_paths` with `accountId` |
| Find NEW people by role at companies I name (I don't have the names) | `search_accounts` (BETA) → wait → `list_pool` → `confirm_pool` |
| Move an intro forward (sent / made / declined) | `set_intro_status` |
| Raw target / connection / tag data | `list_targets`, `get_target_connections`, `list_tags` |
| Add new people / supporters to track | `import_targets`, `import_supporters` |

**"Star" means the `rating`, and only the `rating`.** It is 1–5, higher is better, and it is the
only thing with ★ glyphs. `tier` is the same setting spelled as the raw wire number (1–5, **lower**
is better) — pass it only when the user already holds tier numbers, and never describe it in stars.
The `preferred` flag is a third thing entirely and is **not** a star.

**Legacy — `preferred` and `excluded` (still wired, still work).** The product moved both onto the
rating, so reach for `set_connector_tier` / `ratings` for every set-and-search intent, and use these
two only when the user explicitly asks for those flags:
- `set_connector_preferred` (set) and `list_supporters` with `preferred` (search) drive a separate
  boolean column. `set_connector_tier` **never writes it** — `rating: 5` does not mark someone
  preferred, and marking someone preferred does not give them a rating.
- `set_connector_excluded` hides a connector like `rating: 1` does, but the sync runs **one way**:
  writing a rating updates the flag, while `excluded: false` does *not* clear a `rating: 1`. To
  un-hide someone, give them a `rating` of 2–5 — don't un-exclude.

Tools marked WRITE change Draftboard data; the host approves each call, but still confirm
destructive ones (`archive_target` is **not reversible**) with the user first.

The full 12-pain playbook — including the jobs the Integration API does **not** yet support and the
closest workarounds — is in `references/user-stories.md`. The tool catalog with arguments is in
`references/tools.md`.

## How to work

- **Scope expensive tools.** `find_top_paths` walks each target's connections. Always narrow with
  `tagNames`, `statuses`, `minTargetMaxRank`, `ownerIds`, `accountId`, or `title` before running on a
  big account. If the returned `telemetry.truncated` is true, tell the user the result is partial and
  follow `telemetry.nextSuggestedFilter`.
- **Company questions → scope by `accountId`, don't scan.** For "who do I have at company X" or
  "best intros at company X", resolve the company with `list_accounts` (name → `id`) and pass
  `accountId` to `list_targets` / `find_top_paths`. `find_top_paths` only scans a bounded top-N of
  targets by rank, so a company's lower-ranked or 2nd-degree targets can otherwise be missed
  entirely — the `accountId` scope avoids both the miss and the slow full scan.
- **Company-first discovery is a slow async loop (BETA, Team/Enterprise).** `search_accounts`
  (companies + titles) only *starts* a search and returns a `campaignId` — it does not return people.
  Found people arrive in the pool asynchronously with no completion signal: after a short wait, read
  them with `list_pool` (filter by that `campaignId`), then `confirm_pool` the good ones into targets.
  An empty pool right after a search means "not ready yet", not "nothing found". Confirming spends the
  plan's target capacity — confirm only people the user actually wants; `reject_pool` the rest.
- **Stay inside these tools.** They are the only sanctioned way to reach Draftboard. If a request
  isn't possible with them, say so plainly and stop (or point to the app) — never run raw API
  calls, read API keys from config/files, query a database, or brute-force by paging thousands of
  records. Don't import people as targets just to answer an exploratory question (that changes the
  user's data) without explicit approval.
- **Be honest about coverage.** Always surface counts from `telemetry` (e.g. "scanned the top 25 of
  142 targets"). Never imply you searched everything when you didn't.
- **Connector by name (e.g. "paths through Jane Smith").** The API filters connections by team
  member (`ownerIds`), not by connector name. Run `find_top_paths`, then filter the opportunities
  client-side on the `connector` field, and say you did.
- **An import is accepted, not finished — and there are TWO waits, not one.** Getting this wrong is
  how a perfectly good import gets reported to the user as a failure.
  1. **The target row: about half a minute.** Confirm with `resolve_target`, which finds a saved
     target as soon as the batch lands. `check_if_connected` reports it as `import_pending` until
     then and tells you when to look again.
  2. **Its warm-intro paths: minutes** — 14 minutes on a large network. Only after that does the
     person appear in `list_targets` or carry connectors.

  So `list_targets` answers neither question right after an import: it returns only targets that
  **already have a path**. "Not in `list_targets`" never means "not saved" — say the paths are
  still being computed, and re-check, rather than reporting the person as missing or path-less.
- **Name-drop responsibly.** A connector's `rankDetails`/`scoreDetails` (shared history) describes the
  **connector↔target** relationship — why *that* connector can introduce *that* target. It is **not**
  the user's own background and not the user↔connector history. Use it for the warm line about that
  specific intro, mention only real returned facts, and never present it as a fact about the user or
  invent a shared connection. (The teammate↔connector tie is a bare score with no reason exposed.)
  **The same rule covers `relationships` and `relationshipDetails`**: `current_colleague` means the
  connector and the *target* work together now, and an `employment.company` is *their* shared
  employer — never the user's. Don't say "you both worked at X" off these fields.
- **A missing `relationships`/`relationshipDetails` is not a weak connector.** Both keys are present
  when Draftboard holds that signal for the pair and simply **absent** when it does not (never `[]`),
  so read them as `connection.relationships ?? []`. Absence means "no structured signal for this
  pair", **not** "these two have no relationship": **promote on the signal, never demote on its
  absence** — never drop, downrank, or apologise for a connector on that basis, and keep using
  `scoreDetails`, which carries the human-readable summary (read it as `scoreDetails ?? []` — it too
  is omitted when there is nothing to say). The three `relationships` values are exactly
  `current_colleague`, `former_colleague`, `university_classmate`. The two fields are independent —
  a shared-contacts-only signal gives a `relationshipDetails` record and **no** `relationships`
  entry — so never derive or align one from the other. Details in `references/tools.md` →
  **Field notes**.
- **Tagging or describing connectors/supporters — don't invent a backstory.** The tools return a
  connector's name, LinkedIn URL, position, `rank`, and (for an intro) `rankDetails` — **not** their
  bio, seniority, or personal background. When you tag, rate, or describe a supporter, use only
  user-provided facts or fields actually returned; never infer *whose* network it is, their role, or a
  shared history with the user. If asked to tag supporters "by <something>" you can't verify from
  returned data, say what you're basing the tag on (e.g. the user's own words) rather than guessing.

## Output

Lead with the answer (the top opportunities, the yes/no, the status numbers), then the supporting
detail. For each intro opportunity, name the **connector**, the **target**, the **rank**, and the
**reason** (`rankDetails`). Keep it skimmable.
