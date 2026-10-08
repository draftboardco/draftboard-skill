# Tool catalog

Draftboard's MCP server exposes 28 tools: 6 thin (1:1 with the Integration API), 14 extended,
5 prospecting (BETA discovery), and 3 outcome tools (composed for real jobs). Prefer
outcome tools.

## Outcome tools

### `find_top_paths`
Your strongest **open** warm-intro paths — paths you haven't requested yet — ranked and floored
**server-side**, one per target: a shared employer or school on both sides first, then between the
connector and the target only, then other quality signals (see `basis` below). **One call**; it
never walks targets or connections, so it needs no "scope it, it's expensive" caution.

| Arg | Default | Notes |
|-----|---------|-------|
| `tagNames` | — | Only targets with these tags |
| `tagMatch` | `all` | How several `tagNames` combine — `any` = at least one, `all` = every one |
| `accountId` | — | Only targets at one company (an id from `list_accounts`) — scopes the ranking pool to that company |
| `title` | — | Only targets whose title/position contains this text (case-insensitive) — e.g. "best intros to my Head-of-Sales targets" |
| `ownerIds` | — | Only paths through these team members — ids from `get_me.customer.teamMembers[]` (match by name) |
| `connectorLabels` | — | Only paths through a connector carrying these labels, e.g. `["investor"]` — tokens in **Labels** below |
| `connectorLabelsMatch` | `all` | How several `connectorLabels` combine — `any` = at least one, `all` = every one |
| `excludeConnectorLabels` | — | Leave out paths through a connector carrying **any** of these labels. Pass `do_not_contact` here only when the user asks to leave those people out |
| `ratings` | — | Only paths through connectors **you** rated with one of these stars, `2`–`5`, higher is better — `[4,5]` = "paths through people I would actually ask". Your own rating, also with `ownerIds`. Unrated connectors are left out while it is set. `1` is refused: a connector you hid is never a strongest path |
| `limit` | `20` | Max opportunities returned (1–100) |
| `includeRankDetails` | `true` | Shared-history reasons (for name-drops) |
| `includeRelationships` | `true` | Pass through `relationships` + `relationshipDetails` when the API returns any |

**Deprecated, still accepted:** `statuses`, `minTargetMaxRank`, `minRank`, `maxTargetsScanned`,
`connectorsPerTarget`. Passing one is never a validation error — the server ranks and floors on its
own now, so these are silently ignored and named in `telemetry.ignoredParameters`. For several
connectors on the SAME target (what `connectorsPerTarget` used to control), call
`get_target_connections` instead — `find_top_paths` returns exactly one (the strongest) path per
target.

Returns `{ opportunities[], telemetry{ total, returned, truncated, ignoredParameters? } }`. `total`
is how many paths matched your filters (before `limit`); `returned` is what came back;
`ignoredParameters` is only present when a deprecated arg was passed. Each opportunity:
`{ introId, targetId, target, targetLinkedinUrl, targetCompany, targetHeadline, targetMaxRank,
connector, connectorLinkedinUrl, connectorPosition, rank, rankDetails?, relationships?,
relationshipDetails?, basis, owners[], connectorRating?, connectorLabels? }`. `connectorLabels` are the
connector's labels (see **Labels**) — say them when they explain the pick ("Anna — Investor"). `connectorRating` is **your** star rating of the
connector (1–5, higher is better), absent when you have not rated them — unrated is not a low rating. `targetMaxRank` is kept only for compatibility with
callers of the old shape — it now always equals that row's own `rank`, since there is exactly one
path per target; read `rank`. `relationships`/`relationshipDetails` are present only when the API
holds that signal for the pair; their absence is **not** evidence against the connector (see
**Field notes**).

**`basis` — why a path ranks where it does, one of:**
- `overlap_both_sides` — a shared employer or school on **both** sides of the path (a
  connector↔target overlap, and also a teammate↔connector tie through the same place).
- `overlap_connector_target` — a shared employer or school between the connector and the target
  only.
- `other_quality_signal` — a real, qualifying path with **no** work/school overlap. Describe these
  only from `rankDetails` (e.g. "you both know 500 people") — never call one "strong"; that word
  belongs to the first two bases.

### `check_if_connected`
Given LinkedIn URLs, reports whether the user already has warm paths to each. One direct lookup per
URL — the answer does not depend on how big the saved book is. Imports the ones that are not targets
yet (and only those), then re-checks them. Imports are processed asynchronously, so a brand-new
person usually comes back `import_pending` on this call rather than with an id.

| Arg | Default | Notes |
|-----|---------|-------|
| `linkedinUrls` | (required) | Profile URLs to check — **max 10 per call** (each costs up to three API reads and the account is limited to 50 reads/minute); split larger lists |
| `importIfMissing` | `true` | Import **only** the URLs that turned out not to be targets |
| `tags` | — | Tags for imported targets |

Returns `{ results[ { linkedinUrl, status, isTarget, targetId?, degree?, directlyConnected,
hasPaths, pathsCount?, topConnector?, topRank?, note? } ], telemetry{ checked, resolved, importRequested, importPending },
warnings? }`. `directlyConnected` is true when the target's `degree` is `"1st"` (you/a teammate
already know them directly). Freshly imported people may not have paths until enrichment finishes.

**`status` is the field to read, not `isTarget` alone.** It is `target`, `not_a_target`,
`import_pending`, or `lookup_failed`. On the last two the answer is UNKNOWN and `isTarget`/`hasPaths`
are `null`, not `false` — never tell the user there is no path on the strength of it. `import_pending`
means the import was accepted but Draftboard has not finished processing the batch; re-check with
`resolve_target` in a few moments. `telemetry` carries `importRequested` and `importPending` so a
half-landed import is reported honestly rather than as a row of misses.

For a single person, `resolve_target` answers the same question in one call.

### `intro_status_overview`
Summarize targets by status, with a per-tag breakdown.

| Arg | Default | Notes |
|-----|---------|-------|
| `tagNames` | — | Scope to these tags |
| `tagMatch` | `all` | How several `tagNames` combine — `any` = at least one, `all` = every one |

Returns `{ total, counted, byStatus{}, byTag{}, truncated }`.

## Thin tools

| Tool | Args | Returns |
|------|------|---------|
| `get_me` | — | `{ customer{ id, name, user{ id, firstName, lastName, linkedinUrl }, teamMembers[]{ id, firstName, lastName, linkedinUrl }, credits } }` — `teamMembers[].id` is a valid `ownerIds` value; `credits` is the team's credit balance (writes are refused only at 0; missing = unknown, not 0) |
| `list_tags` | `query?, type?, pageNumber?, resultPerPage?` | `{ tags[], count, nextPage }`. `type` is `manual` (you created it) or `automatic` (a system batch/date marker). |
| `list_targets` | `updatedSince?, tagIds?, tagNames?, tagMatch?, statuses?, accountId?, title?, pageNumber?, resultPerPage?` | `{ targets[], count, nextPage }` — **only targets that already have at least one path**; `accountId` filters to one company (id from `list_accounts`); `title` is a case-insensitive title/position substring |
| `resolve_target` | `linkedinUrl (required)` | `{ found: true, target }` or `{ found: false, linkedinUrl, note }`. One direct lookup — finds **any** non-archived target, including one just imported with no paths yet. `found: false` is an answer, not an error. |
| `import_targets` | `linkedinUrls (required), tags?` | `{ imported, notImported, …, note, confirmWith, pathsWith }`. **Accepted, not finished.** The row appears in ~30s — confirm it with `resolve_target`, never with `list_targets` (an empty result there is not a failed import). Paths take minutes; poll `get_target_connections`. |
| `get_target_connections` | `targetId (required), updatedSince?, ownerIds?, ratings?, connectorLabels?, connectorLabelsMatch?, excludeConnectorLabels?, pageNumber?, resultPerPage?` | `{ connections[], count, nextPage }` — each connection has `score`, `scoreDetails`, `owners`, `rating` (**your** star rating of the connector, 1–5, higher is better; absent when unrated), and **may** have `relationships` / `relationshipDetails` (see **Field notes**). `ratings` (1–5, e.g. `[4,5]`) keeps only paths through connectors you rated so; `ratings: [1]` returns the ones you hid. Each connection carries its `labels`; the three label args filter as on `find_top_paths` |
| `list_accounts` | `query?, connectionDegree?, pageNumber?, resultPerPage?` | `{ accounts[ {id, name, targetsCount, firstDegreeCount, secondDegreeCount, pathsCount} ], count, nextPage }`. Company search: pass a company name as `query`, take the account `id` from the result. |

**Tag types.** A tag's `type` is only ever `manual` — a label the customer created and applied (import, attach-tags, campaign names) — or `automatic` — a marker Draftboard stamps on a whole ingested batch, usually the date (e.g. `20-Apr-2026`). There is **no queryable `icp` tag type** (`?type=icp` is rejected); aim at an "ICP" group by its tag **name**, not a type.

**Resolve a person (the drill).** To answer anything about ONE named person — "is X already a target", "what's X's id", "who can introduce me to X" — resolve them: `resolve_target` with their `linkedinUrl` → take `target.id` → `get_target_connections` for the connectors. Two calls. Never page `list_targets` looking for someone: that is one request per 100 targets, and `list_targets` omits targets whose paths have not been computed yet, so a saved person can look missing when they are not. For a batch of URLs use `check_if_connected`, which does the same lookup per URL.

**Scope by company (the drill).** To answer "who do I have at company X" or "best intros to my targets at company X", do NOT page the whole target list. Resolve the company first: `list_accounts` with `query: "<company name>"` → take the `id` → then `list_targets` with `accountId` (the saved leads there) or `find_top_paths` with `accountId` (the ranked intro opportunities there). Two calls, not 45 pages.

## Extended tools (rest of the API)

⚠ = changes data; the host approves each call at runtime.

| Tool | Args | Notes |
|------|------|-------|
| `list_network_connections` | `ownerIds?, query?, preferred?, ratings?, tiers?, labels?, labelsMatch?, excludeLabels?, pageNumber?, resultPerPage?` | Read-only. **The team's network** — the people it can ask for intros. **`ownerIds`** (ids from `get_me`: yours = `customerProfileId`, a teammate's = `teamMembers[].id`, up to 50) returns **exactly the LinkedIn 1st-degree connections** of those members, nobody else — this is how you list or export "my connections" / "Alice's connections"; pass every member for the whole team. Without `ownerIds` you get the team's combined list, which is broader than LinkedIn (people added by hand as supporters, colleagues inferred from shared employers, the members themselves). Each row carries **`owners`** — who on the team knows that person (always the whole team, never narrowed by `ownerIds`; `[]` = nobody). 100 per page at most: page until `nextPage` is 0 and say how many you read. Resolve a name to an id from `get_me` yourself; if it fits several members or none exactly, ask the user which one. **SEARCH BY RATING**: each returned row carries your personal star **`rating` 1..5 — higher is better** (5 = ★★★★★ "ask anytime", 1 = ★ "don't ask"), absent when unreviewed, plus `tier`, the same setting spelled as the raw wire number (1..5, **lower is better**: tier 1 = "ask anytime", tier 5 = "don't ask"). Filter with `ratings` — **`[5]` (or `[4,5]`) is "my closest connections"**. `tiers` is the same filter on the wire scale, and the two are **unioned, not intersected**. **`ratings: [1]` doubles as the "Hidden" scope:** a connector rated 1 is hidden from the default listing, and asking for `[1]` is the only way to list them — there is no separate hidden flag. *(Team exception: a connector YOU rated 1 still appears in your default listing while a teammate keeps them visible, carrying your own `rating: 1`. With `ownerIds`, hidden means each listed member's own choice: people a teammate hid are left out of that teammate's list.)* To **set** a rating, use `set_connector_tier`; `preferred` is a legacy filter, see **Legacy toggles** below. **BY LABEL**: each row carries `labels`; filter with `labels` (+ `labelsMatch` `all`\|`any`, default `all`) and `excludeLabels` — see **Labels** below. |
| `get_label_counts` | the filters of `list_network_connections` (same names) | Read-only. **Counts, not people**: `{ total, unrated, ratings[{rating,count}], labels[{label,scope,count}], zeroLabels[] }` in one cheap call — "how many investors do I know?", "how is my network labelled?", "how many haven't I rated?". Each section ignores its own filter: a label's count is what `list_network_connections` with `labels: [that label]` plus your other filters would return, and `ratings`/`unrated` ignore the rating filters; `total` applies every filter and equals that list's `count`. To see the people, call `list_network_connections` with the same filters. |
| `find_network_companies` | `query?, labels?, labelsMatch?, pageNumber?, resultPerPage?` | Read-only. Companies where people in the network **currently** work, by name and/or company label: `{ companies[ {id, name, connectorsCount, labels[]} ], count, nextPage }`. `connectorsCount` = how many people a company label would reach. The `id` is what `set_company_labels` takes — **not** an account id from `list_accounts`. One employer can come back as several rows (different spellings or records), each with its own count. |
| `get_connector_intros` | `connectorId (required), pageNumber?, resultPerPage?` | Connector-first: who this person can introduce you to. `connectorId` = a connection's `connectorId` (not its `id`) or a supporter's `id`. Each item carries `score` + `scoreDetails` and may also carry `relationships` / `relationshipDetails` (see **Field notes**). The response's `connector` object carries your star `rating` (1..5, higher is better). |
| `set_connector_tier` ⚠ | `connectorId, rating (1–5)` **or** `tier (0–5)` — exactly one | **SET THE STARS — rate / prioritize a supporter.** `rating` is the star scale, **higher is better**: `5` = ★★★★★ "ask anytime" (closest) down to `1` = ★ "don't ask", with `4`, `3` and `2` in between — **and `rating: 1` also hides the connector** from the default listings. `tier` is the same setting spelled as the raw wire number, where **lower is better** (1 = "ask anytime" … 5 = "don't ask", 0 = clear); it still works and is not deprecated. Send **exactly one** of the two — both, or neither, is rejected. There is no `rating: 0`: **clearing a rating stays `tier: 0`**. `connectorId` = a connection's `connectorId` (not its `id`) / a supporter's `id`. Read back via `list_network_connections` (`rating` field / `ratings` filter). Does **not** touch the legacy `preferred` flag. |
| `set_connector_labels` ⚠ | `connectorId, add?, remove?` | Label ONE person: `{ "add": ["investor"] }`. `connectorId` as for `set_connector_tier`. Settable: org `investor`, `customer`, `advisor`, `partner`, `do_not_contact`; personal `close_friend`, `family`, `mentor`. Adding a label already there, or removing one that is not, changes nothing. |
| `set_company_labels` ⚠ | `companyId, add?, remove?` | Label a COMPANY, so everyone in the network who currently works there carries it. Settable: `investor`, `customer`, `partner`, `do_not_contact` (all org). `companyId` comes from `find_network_companies` only — an account id is refused. |
| `import_supporters` ⚠ | `linkedinUrls (1–100)` | Add supporters by URL. |
| `attach_tags_to_targets` ⚠ | `targetIds (1+)`, and ≥1 of `tagIds` / `tagNames` | Tag one/many targets; all-or-nothing. |
| `set_intro_status` ⚠ | `introId, status (requested\|completed\|declined), reasonId?, customReason?` | Drive an intro's lifecycle. |
| `archive_target` ⚠ | `targetId, confirm (must be true)` | Soft-delete a target — **not reversible** via the API. Requires `confirm: true`; confirm with the user first. |

**"Star" = the `rating`.** ★ glyphs describe the `rating` only — 1..5, higher is better. `tier` is
the same setting spelled as the raw wire number (1..5, **lower** is better) and is never written in
stars. The `preferred` flag is a separate boolean and is not a star at all.

**Four capabilities, kept apart:**

| Intent | Call |
|--------|------|
| Set a rating ("star this person", "rate them 5") | `set_connector_tier` with `rating` (`tier: 0` clears) |
| Search by rating ("my starred connections", "who did I rate 5") | `list_network_connections` with `ratings` |
| *(legacy)* set preferred | `set_connector_preferred` |
| *(legacy)* search by preferred | `list_network_connections` with `preferred` |

**Legacy toggles** (⚠ — still wired and still working; the product moved both axes onto the rating,
so prefer `set_connector_tier` / `ratings` unless the user explicitly asks for these flags):

| Tool | Args | Notes |
|------|------|-------|
| `set_connector_preferred` ⚠ | `connectorId, preferred (bool)` | Mark/unmark a connector as a preferred supporter. `preferred` is its own boolean column, **not** the rating: `set_connector_tier` **never writes it**, so `rating: 5` does not mark someone preferred, and marking someone preferred does not give them a rating. Search the same flag with `list_network_connections` (`preferred: true` = only flagged connectors, `false` = only unflagged, omit = full network). |
| `set_connector_excluded` ⚠ | `connectorId, excluded (bool)` | Exclude/un-exclude a connector from warm-path results. `set_connector_tier` with `rating: 1` hides a connector and sets this flag for you — but the sync runs **one way**: `excluded: false` does **not** clear a `rating: 1`, it leaves them rated don't-ask while un-excluded. To un-hide someone, give them a `rating` of 2–5. |

**Field notes.** Raw API targets carry `score` (best path, 0–100), `connectionsNumber`, and
`degree` (`"1st"`/`"2nd"`). Raw connections carry `score` (0–100), `scoreDetails` (shared-history
reasons), and `owners` (team members who can make the intro — each with their own `score` and an
`id` you can pass as `ownerIds`). The outcome tools normalize these into `rank`/`rankDetails`/
`targetMaxRank` in their output. Raw network rows (`list_network_connections`) carry `owners` (who on the team knows them) and your personal star
`rating` — 1..5, **higher is better**, absent when unreviewed — plus `tier`, the same setting on the
raw wire scale, 1..5 where **lower is better**; set either with `set_connector_tier`.
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

🔴 **They are present when Draftboard holds that signal for the pair, and omitted when it does
not.** **Absence means "we hold no structured signal for this pair" — NOT "these two have no
relationship."** **Promote on the signal; never demote on its absence:** never drop, downrank, or
skip a connector because these fields are missing, and never tell the user a connector has no
shared history on that basis. `scoreDetails` carries the human-readable summary and stays the
fallback (it too is omitted when there is nothing to say — read it as `scoreDetails ?? []`).

The two fields are also **independent**, not two views of one thing: a connection whose only signal
is shared contacts gets a `relationshipDetails` record and **no** `relationships` entry, while
another can carry `relationships` with no records. Never derive, gate, or index-align one from
the other or from `scoreDetails`.

**Whose history is `scoreDetails`/`rankDetails`/`relationships`/`relationshipDetails`?** They all
explain why **that connector** can introduce **that target** — they describe the
**connector↔target** pair, **not** the user's background and not the user↔connector relationship.
So `current_colleague` means the connector and the target work together *now* — it says nothing
about where the user works, and a shared `employment.company` is *their* shared employer, not the
user's. Use them only for the warm line about that specific intro; never present them as facts
about the user. The teammate↔connector tie (`owners[].score`) is a strength number only — no
shared-history reason is exposed for it, so don't invent one.

## Labels

A label says **who someone is to the customer**. Tokens, lowercase:

| Kind | Tokens | Who sees it | Set with |
|------|--------|-------------|----------|
| Org | `investor`, `customer`, `advisor`, `partner`, `do_not_contact` | The whole team, with who set it | `set_connector_labels`, or `set_company_labels` (all but `advisor`) |
| Personal | `close_friend`, `family`, `mentor` | Only the caller | `set_connector_labels` |
| Supporter | `supporter` | Only the caller | **Not a label write** — it is the caller's 2–5 star rating: `set_connector_tier` |
| Automatic | `current_colleague`, `former_colleague`, `university_classmate` | Everyone | Nobody — derived from work and school history; cannot be set or removed |

- **`do_not_contact` is a plain label.** It marks the person and hides nobody. Leave those people
  out (`excludeLabels` / `excludeConnectorLabels`) only when the user asks to.
- **A count of 0 is "nobody labelled yet", not "you know no investors".** Labels are only what the
  team has set. Say so, and offer to label people.
- **Label a company in three steps.** `find_network_companies` with the name → show the user
  **every** matching row with its `connectorsCount` (one employer can appear as several rows) and
  say how many people the label will reach → `set_company_labels` once per row they pick.
- **Personal labels and `supporter` are the caller's own,** also when reading a teammate's network
  with `ownerIds`: "Family" there is *your* label, not the teammate's.

## Prospecting — company-first discovery (⚠ BETA)

A different mode from everything above: instead of working over people you already track, these find
**new** people by role at named companies. Most of them become targets without a review step; the loop
for the rest is asynchronous:

`search_accounts` → (wait) → `list_pool` → `confirm_pool` / `reject_pool`

| Tool | Args | Notes |
|------|------|-------|
| `search_accounts` ⚠ | `companies (1–50)`, `titles (1–20)`, `name?` | BETA. `companies` = domains (`acme.com`) or `linkedin.com/company/…` URLs; `titles` = the persona. Returns `{ campaignId, imported, notImportedAccounts }`. People found are normally added as targets **automatically**, up to a limit per company, and their warm paths are charged; only the ones beyond that limit wait in the pool. Everyone arrives **asynchronously** — there is no completion signal. Not idempotent: every call launches a new search. |
| `list_pool` | `campaignId?, accountId?, tagIds?, tagMatch?, query?, minIcpFit?, pageNumber?, resultPerPage?` | Discovered prospects awaiting confirm/reject: `{ prospects[ {id, name, linkedinUrl, headline, accountName, source, tags, icpFits} ], count, nextPage }`. Filter by the `campaignId` from `search_accounts` or `search_supporters` — this is where a supporter search's results arrive. `icpFits` = one `{ campaignId, percent?, reason? }` per supporter search with an `icp` that found this person (only that search's entry when you pass `campaignId`); no `percent` = could not be assessed, not 0; empty = no such search found them. A person fits at `percent` 50 or more — the product's threshold, do not invent others. Never hides anyone; `minIcpFit` (0–100, requires `campaignId`) keeps only people scored at or above it and leaves out the ones that could not be assessed. Empty right after a search = results may not be ready yet; it does not mean the search has finished. |
| `confirm_pool` ⚠ | `ids (1+)` | Promote pool prospects into targets (idempotent). Every requested id still in the pool is confirmed — nothing is held back. Returns `{ confirmedCount, remainingCapacity }`; `remainingCapacity` is informational, not a limit. After this they're real targets and their warm paths are charged — tell the user before confirming. `find_top_paths` / `list_targets` include them. |
| `reject_pool` ⚠ | `ids (1+)` | Discard pending pool prospects (soft-delete status-`new`). Idempotent. |

**The loop.** "Find me Heads of Sales at Acme and Globex" → tell the user the people found are normally added as targets automatically and their paths are charged → `search_accounts({ companies: ["acme.com", "globex.com"], titles: ["Head of Sales"] })` once → keep the returned `campaignId` → after a short wait `find_top_paths` / `list_targets` for the ones already added, and `list_pool({ campaignId })` for the ones held back → `confirm_pool` only the `ids` the user wants (charged the same way), `reject_pool` the rest.

### Supporter-first discovery (⚠ BETA)

Finds new people by role **inside the networks of people the user knows**, instead of at named
companies. Nobody it finds becomes a target on their own: everyone waits in the pool for review, and
nothing is charged until they are confirmed.

| Tool | Args | Notes |
|------|------|-------|
| `search_supporters` ⚠ | `supporters (1+)`, `titles (1+)`, `companies?`, `name?`, `icp?` | BETA. `supporters` = LinkedIn profile URLs (`linkedin.com/in/…`); `titles` = the persona; `companies` = domains or `linkedin.com/company/…` URLs, omit to search the whole network. Returns `{ status, errors, campaignId, importedSupporters, notImportedSupporters }` — `importedSupporters` counts the supporters accepted, not people found. **Everyone found waits in the pool** — launching charges nothing. Someone rejected earlier stays rejected. People arrive **over time** — no completion signal. Not idempotent: every call launches a new search. Does not change anyone's rating. `icp` = `{ industry?, companySize?, location?, description? }`, at least one filled, each ≤ 500 characters: the user's ideal customer, taken only from what they said. Everyone found is then scored for fit (`icpFits` on `list_pool`); nobody is hidden. Refused together with `companies`. |

**The loop.** Launch it once and keep the `campaignId` → check back later with
`list_pool({ campaignId })` (empty soon after = may not be ready yet, not finished) → **before `confirm_pool`**, tell the
user plainly: "confirming takes these people on as targets, and their warm paths are charged like any
target's" → `confirm_pool` the `ids` they want in one batch, `reject_pool` the rest.

**With an ideal customer.** Pass `icp` only with what the user described (never guess the missing
fields, never add `companies`) → later `list_pool({ campaignId, minIcpFit: 50 })` for the people who
fit → show them to the user with each `reason`, and say the rest are a poor fit or could not be
assessed → `confirm_pool` only the `ids` the user picks, after the same charging warning.
