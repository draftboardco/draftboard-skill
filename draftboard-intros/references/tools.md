# Tool catalog

The `@draftboard/mcp` server exposes 5 thin tools (1:1 with the Integration API) and 3 outcome
tools (composed for real jobs). Prefer outcome tools.

## Outcome tools

### `find_top_paths`
Best warm-intro opportunities right now. Ranks targets by best path, then fetches each one's
strongest connectors. **Expensive** (walks connections per target) — scope it.

| Arg | Default | Notes |
|-----|---------|-------|
| `tagNames` | — | Only targets with these tags |
| `accountId` | — | Only targets at one company (an id from `list_accounts`) — scopes "best intros" to that company |
| `ownerIds` | — | Only paths through these team members (from `get_me`) |
| `statuses` | `["new"]` | `new` / `completed` / `stopped` |
| `minTargetMaxRank` | `0` | Skip weakly-reachable targets |
| `minRank` | `0` | Drop weak connectors |
| `limit` | `20` | Max opportunities returned |
| `maxTargetsScanned` | `25` | How many targets to fetch connections for |
| `connectorsPerTarget` | `3` | Top connectors per target |
| `includeRankDetails` | `true` | Shared-history reasons (for name-drops) |

Returns `{ opportunities[], telemetry{ targetsMatched, targetsScanned, connectionsFetched,
opportunitiesFound, truncated, nextSuggestedFilter? }, warnings? }`. Each opportunity:
`{ target, targetLinkedinUrl, targetCompany, targetMaxRank, connector, connectorLinkedinUrl,
connectorPosition, rank, rankDetails?, owners[] }`.

### `check_if_connected`
Given LinkedIn URLs, reports whether the user already has warm paths to each. Imports missing ones
by default.

| Arg | Default | Notes |
|-----|---------|-------|
| `linkedinUrls` | (required) | Profile URLs to check |
| `importIfMissing` | `true` | Import URLs that aren't targets yet |
| `tags` | — | Tags for imported targets |

Returns `{ results[ { linkedinUrl, isTarget, targetId?, degree?, directlyConnected, hasPaths,
pathsCount?, topConnector?, topRank?, note? } ], telemetry, warnings? }`. `directlyConnected` is true
when the target's `degree` is `"1st"` (you/a teammate already know them directly). Freshly imported
people may not have paths until enrichment finishes.

### `intro_status_overview`
Summarize targets by status, with a per-tag breakdown.

| Arg | Default | Notes |
|-----|---------|-------|
| `tagNames` | — | Scope to these tags |

Returns `{ total, counted, byStatus{}, byTag{}, truncated }`.

## Thin tools

| Tool | Args | Returns |
|------|------|---------|
| `get_me` | — | `{ customer{ id, name, user{ id, firstName, lastName, linkedinUrl } } }` |
| `list_tags` | `query?, type?, pageNumber?, resultPerPage?` | `{ tags[], count, nextPage }` |
| `list_targets` | `updatedSince?, tagIds?, tagNames?, statuses?, accountId?, pageNumber?, resultPerPage?` | `{ targets[], count, nextPage }` — `accountId` filters to one company (id from `list_accounts`) |
| `import_targets` | `linkedinUrls (required), tags?` | import result |
| `get_target_connections` | `targetId (required), updatedSince?, ownerIds?, pageNumber?, resultPerPage?` | `{ connections[], count, nextPage }` |
| `list_accounts` | `query?, connectionDegree?, pageNumber?, resultPerPage?` | `{ accounts[ {id, name, targetsCount, firstDegreeCount, secondDegreeCount, pathsCount} ], count, nextPage }`. Company search: pass a company name as `query`, take the account `id` from the result. |

**Scope by company (the drill).** To answer "who do I have at company X" or "best intros to my targets at company X", do NOT page the whole target list. Resolve the company first: `list_accounts` with `query: "<company name>"` → take the `id` → then `list_targets` with `accountId` (the saved leads there) or `find_top_paths` with `accountId` (the ranked intro opportunities there). Two calls, not 45 pages.

## Extended tools (rest of the API)

⚠ = changes data; the host approves each call at runtime.

| Tool | Args | Notes |
|------|------|-------|
| `list_supporters` | `query?, preferred?, pageNumber?, resultPerPage?` | Closest/preferred connectors. `preferred:true` = starred only, `false` = non-starred, omit = full network. |
| `get_connector_intros` | `connectorId (required), pageNumber?, resultPerPage?` | Connector-first: who this person can introduce you to. `connectorId` = a connection's `connectorId` (not its `id`) or a supporter's `id`. |
| `set_connector_preferred` ⚠ | `connectorId, preferred (bool)` | Star/unstar a supporter. |
| `set_connector_excluded` ⚠ | `connectorId, excluded (bool)` | Exclude/un-exclude a connector. |
| `import_supporters` ⚠ | `linkedinUrls (1–100)` | Add supporters by URL. |
| `attach_tags_to_targets` ⚠ | `targetIds (1+)`, and ≥1 of `tagIds` / `tagNames` | Tag one/many targets; all-or-nothing. |
| `set_intro_status` ⚠ | `introId, status (requested\|completed\|declined), reasonId?, customReason?` | Drive an intro's lifecycle. |
| `archive_target` ⚠ | `targetId, confirm (must be true)` | Soft-delete a target — **not reversible** via the API. Requires `confirm: true`; confirm with the user first. |

**Field notes.** Raw API targets carry `score` (best path, 0–100), `connectionsNumber`, and
`degree` (`"1st"`/`"2nd"`). Raw connections carry `score` (0–100), `scoreDetails` (shared-history
reasons), and `owners` (team members who can make the intro — each with their own `score` and an
`id` you can pass as `ownerIds`). The outcome tools normalize these into `rank`/`rankDetails`/
`targetMaxRank` in their output. Pagination: loop pages until `nextPage` is `0`.

**Whose history is `scoreDetails`/`rankDetails`?** They explain why **that connector** can introduce
**that target** — they describe the **connector↔target** pair, **not** the user's background and not
the user↔connector relationship. Use them only for the warm line about that specific intro; never
present them as facts about the user. The teammate↔connector tie (`owners[].score`) is a strength
number only — no shared-history reason is exposed for it, so don't invent one.
