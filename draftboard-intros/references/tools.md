# Tool catalog

The `@draftboard/mcp` server exposes 22 tools: 6 thin (1:1 with the Integration API), 9 extended,
4 prospecting (BETA company-first discovery), and 3 outcome tools (composed for real jobs). Prefer
outcome tools.

## Outcome tools

### `find_top_paths`
Best warm-intro opportunities right now. Ranks targets by best path, then fetches each one's
strongest connectors. **Expensive** (walks connections per target) — scope it.

| Arg | Default | Notes |
|-----|---------|-------|
| `tagNames` | — | Only targets with these tags |
| `accountId` | — | Only targets at one company (an id from `list_accounts`) — scopes "best intros" to that company |
| `title` | — | Only targets whose title/position contains this text (case-insensitive) — e.g. "best intros to my Head-of-Sales targets" |
| `ownerIds` | — | Only paths through these team members — ids from `get_me.customer.teamMembers[]` (match by name) |
| `statuses` | `["new"]` | `new` / `completed` / `stopped` |
| `minTargetMaxRank` | `0` | Skip weakly-reachable targets |
| `minRank` | `0` | Drop weak connectors |
| `limit` | `20` | Max opportunities returned |
| `maxTargetsScanned` | `25` | How many targets to fetch connections for |
| `connectorsPerTarget` | `3` | Top connectors per target |
| `includeRankDetails` | `true` | Shared-history reasons (for name-drops) |
| `includeRelationships` | `true` | Pass through `relationships` + `relationshipDetails` when the API returns any |

Returns `{ opportunities[], telemetry{ targetsMatched, targetsScanned, connectionsFetched,
opportunitiesFound, truncated, nextSuggestedFilter? }, warnings? }`. Each opportunity:
`{ target, targetLinkedinUrl, targetCompany, targetMaxRank, connector, connectorLinkedinUrl,
connectorPosition, rank, rankDetails?, relationships?, relationshipDetails?, owners[] }`. The last
two are present only when the API returned something for that pair — usually it does not, which is
**not** evidence against the connector (see **Field notes**).

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
| `get_me` | — | `{ customer{ id, name, user{ id, firstName, lastName, linkedinUrl }, teamMembers[]{ id, firstName, lastName, linkedinUrl } } }` — `teamMembers[].id` is a valid `ownerIds` value |
| `list_tags` | `query?, type?, pageNumber?, resultPerPage?` | `{ tags[], count, nextPage }`. `type` is `manual` (you created it) or `automatic` (a system batch/date marker). |
| `list_targets` | `updatedSince?, tagIds?, tagNames?, statuses?, accountId?, title?, pageNumber?, resultPerPage?` | `{ targets[], count, nextPage }` — `accountId` filters to one company (id from `list_accounts`); `title` is a case-insensitive title/position substring |
| `import_targets` | `linkedinUrls (required), tags?` | import result |
| `get_target_connections` | `targetId (required), updatedSince?, ownerIds?, pageNumber?, resultPerPage?` | `{ connections[], count, nextPage }` — each connection has `score`, `scoreDetails`, `owners`, and **may** have `relationships` / `relationshipDetails` (see **Field notes**) |
| `list_accounts` | `query?, connectionDegree?, pageNumber?, resultPerPage?` | `{ accounts[ {id, name, targetsCount, firstDegreeCount, secondDegreeCount, pathsCount} ], count, nextPage }`. Company search: pass a company name as `query`, take the account `id` from the result. |

**Tag types.** A tag's `type` is only ever `manual` — a label the customer created and applied (import, attach-tags, campaign names) — or `automatic` — a marker Draftboard stamps on a whole ingested batch, usually the date (e.g. `20-Apr-2026`). There is **no queryable `icp` tag type** (`?type=icp` is rejected); aim at an "ICP" group by its tag **name**, not a type.

**Scope by company (the drill).** To answer "who do I have at company X" or "best intros to my targets at company X", do NOT page the whole target list. Resolve the company first: `list_accounts` with `query: "<company name>"` → take the `id` → then `list_targets` with `accountId` (the saved leads there) or `find_top_paths` with `accountId` (the ranked intro opportunities there). Two calls, not 45 pages.

## Extended tools (rest of the API)

⚠ = changes data; the host approves each call at runtime.

| Tool | Args | Notes |
|------|------|-------|
| `list_supporters` | `query?, preferred?, ratings?, tiers?, pageNumber?, resultPerPage?` | Your rated / closest connectors. Each returned supporter carries your personal star **`rating` 1..5 — higher is better** (5 = ★★★★★ "ask anytime", 1 = ★ "don't ask"), absent when unreviewed, plus `tier`, the same value on the raw wire scale (`rating = 6 - tier`, counts down). Filter with `ratings` — **`[5]` (or `[4,5]`) is "my closest connections"**. `tiers` is the same filter wire-side (`[1]` ≡ `ratings: [5]`) and the two are **unioned, not intersected**. **`ratings: [1]` doubles as the "Hidden" scope:** a connector rated 1 is hidden from the default listing, and asking for `[1]` (≡ `tiers: [5]`) is the only way to list them — there is no separate hidden flag. *(Team exception: a connector YOU rated 1 still appears in your default listing while a teammate keeps them visible, carrying your own `rating: 1`.)* `preferred` is the legacy star flag (`true` ≈ `rating: 5`): `true` = starred only, `false` = non-starred, omit = full network. |
| `get_connector_intros` | `connectorId (required), pageNumber?, resultPerPage?` | Connector-first: who this person can introduce you to. `connectorId` = a connection's `connectorId` (not its `id`) or a supporter's `id`. Each item carries `score` + `scoreDetails` and may also carry `relationships` / `relationshipDetails` (see **Field notes**). The response's `connector` object carries your star `rating` (1..5, higher is better). |
| `set_connector_preferred` ⚠ | `connectorId, preferred (bool)` | Star/unstar a supporter. **Legacy** — the product moved this onto the rating (`preferred: true` is in practice `rating: 5`); for a new write prefer `set_connector_tier`. |
| `set_connector_excluded` ⚠ | `connectorId, excluded (bool)` | Exclude/un-exclude a connector. **Legacy** — the product moved this onto the rating (`excluded: true` ≡ `rating: 1`, which also hides them); for a new write prefer `set_connector_tier` with `rating: 1`. |
| `set_connector_tier` ⚠ | `connectorId, rating (1–5)` **or** `tier (0–5)` — exactly one | **Rate / prioritize a supporter.** `rating` is the star scale, **higher is better**: `5` = ★★★★★ "ask anytime" (closest) down to `1` = ★ "don't ask", with `4`, `3` and `2` in between — **and `rating: 1` also hides the connector** from the default listings. `tier` is the same value on the raw wire scale, counting down (`tier = 6 - rating`); it still works and is not deprecated. Send **exactly one** of the two — both, or neither, is rejected. There is no `rating: 0`: **clearing a rating stays `tier: 0`**. `connectorId` = a connection's `connectorId` (not its `id`) / a supporter's `id`. Read back via `list_supporters` (`rating` field / `ratings` filter). |
| `import_supporters` ⚠ | `linkedinUrls (1–100)` | Add supporters by URL. |
| `attach_tags_to_targets` ⚠ | `targetIds (1+)`, and ≥1 of `tagIds` / `tagNames` | Tag one/many targets; all-or-nothing. |
| `set_intro_status` ⚠ | `introId, status (requested\|completed\|declined), reasonId?, customReason?` | Drive an intro's lifecycle. |
| `archive_target` ⚠ | `targetId, confirm (must be true)` | Soft-delete a target — **not reversible** via the API. Requires `confirm: true`; confirm with the user first. |

**Field notes.** Raw API targets carry `score` (best path, 0–100), `connectionsNumber`, and
`degree` (`"1st"`/`"2nd"`). Raw connections carry `score` (0–100), `scoreDetails` (shared-history
reasons), and `owners` (team members who can make the intro — each with their own `score` and an
`id` you can pass as `ownerIds`). The outcome tools normalize these into `rank`/`rankDetails`/
`targetMaxRank` in their output. Raw supporters (`list_supporters`) carry your personal star
`rating` — 1..5, **higher is better**, absent when unreviewed — plus `tier`, the same value on the
raw wire scale counting down (`rating = 6 - tier`); set either with `set_connector_tier`.
Pagination: loop pages until `nextPage` is `0`.

**How the connector and the target know each other (`relationships` / `relationshipDetails`).**
`get_target_connections` and `get_connector_intros` may carry two structured fields alongside
`scoreDetails`; `find_top_paths` passes them through onto each opportunity.

- `relationships` — a list of zero or more of exactly `current_colleague`, `former_colleague`,
  `university_classmate`. No other value is ever emitted.
- `relationshipDetails` — the machine-readable facts behind `scoreDetails`: one record per shared
  company / school / mutual-contact signal, with **exactly one** of `employment` (`company`,
  `department`, `location`, `overlapStartDate`, `overlapEndDate` as ISO `yyyy-MM-dd`, `loose`,
  `unit`) / `education` (`school` + the same window) / `mutualConnections` (`count`) set, plus that
  record's own `score`.

🔴 **Both keys are ABSENT when empty — the key is simply not in the JSON, it is never `[]`.** Read
them as `connection.relationships ?? []`.

🔴 **Empty is the MAJORITY case** — measured in production, `relationships` is non-empty on ~7.6%
of scored relationships and `relationshipDetails` on ~0.5% (anything scored before the structured
model shipped carries neither, and there is no backfill). **Absence means "we hold no structured signal for this pair" — NOT "these two have no
relationship."** Never drop, downrank, or skip a connector because these fields are missing, and
never tell the user a connector has no shared history on that basis. `scoreDetails` stays the
always-present fallback and the authoritative human-readable list.

The two fields are also **independent**, not two views of one thing: a connection whose only signal
is shared contacts gets a `relationshipDetails` record and **no** `relationships` entry, while an
older rank can carry `relationships` with no records. Never derive, gate, or index-align one from
the other or from `scoreDetails`.

**Whose history is `scoreDetails`/`rankDetails`/`relationships`/`relationshipDetails`?** They all
explain why **that connector** can introduce **that target** — they describe the
**connector↔target** pair, **not** the user's background and not the user↔connector relationship.
So `current_colleague` means the connector and the target work together *now* — it says nothing
about where the user works, and a shared `employment.company` is *their* shared employer, not the
user's. Use them only for the warm line about that specific intro; never present them as facts
about the user. The teammate↔connector tie (`owners[].score`) is a strength number only — no
shared-history reason is exposed for it, so don't invent one.

## Prospecting — company-first discovery (⚠ BETA · Team/Enterprise)

A different mode from everything above: instead of working over people you already track, these find
**new** people by role at named companies. The loop is asynchronous:

`search_accounts` → (wait) → `list_pool` → `confirm_pool` / `reject_pool`

| Tool | Args | Notes |
|------|------|-------|
| `search_accounts` ⚠ | `companies (1–50)`, `titles (1–20)`, `name?` | BETA. `companies` = domains (`acme.com`) or `linkedin.com/company/…` URLs; `titles` = the persona. Returns `{ campaignId, imported, notImportedAccounts }`. People surface in the pool **asynchronously** — there is no completion signal. |
| `list_pool` | `campaignId?, accountId?, tagIds?, query?, pageNumber?, resultPerPage?` | Discovered prospects awaiting confirm/reject: `{ prospects[ {id, name, linkedinUrl, headline, accountName, source, tags} ], count, nextPage }`. Filter by the `campaignId` from `search_accounts`. Empty right after a search = "not ready yet". |
| `confirm_pool` ⚠ | `ids (1+)` | Promote pool prospects into targets (capacity-checked, idempotent). Returns `{ confirmedCount, remainingCapacity }`. After this they're real targets — `find_top_paths` / `list_targets` include them. |
| `reject_pool` ⚠ | `ids (1+)` | Discard pending pool prospects (soft-delete status-`new`). Idempotent. |

**The loop.** "Find me Heads of Sales at Acme and Globex" → `search_accounts({ companies: ["acme.com", "globex.com"], titles: ["Head of Sales"] })` → keep the returned `campaignId` → after a short wait `list_pool({ campaignId })` → `confirm_pool` the good `ids` into targets → then `find_top_paths` for warm intros to them. Confirming spends the plan's target capacity, so confirm only what the user wants.
