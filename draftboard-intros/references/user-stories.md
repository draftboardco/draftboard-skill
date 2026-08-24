# User-story playbook

How to solve each documented customer pain with the Draftboard MCP. ✅ = supported today,
🟡 = partial / workaround, 🚧 = not yet exposed by the Integration API (roadmap).

### 1. ✅ Map paths through specific people who I know will intro for me
For a **named connector**, get their connector id (the `connectorId` on a connection, or a
supporter's id) and call `get_connector_intros` — it lists exactly who that person can introduce you
to, with scores and shared-history reasons. For **teammates**, use `find_top_paths` with their
`ownerIds`.

### 2. ✅ I have target accounts (companies) but no people — find intros to those accounts
Two modes now. **Already have people at those companies?** `list_accounts` gives the account-level
view — every company where you have targets, with 1st-/2nd-degree reach — and you can filter targets
to one company (`accountId`) or to a title/role (`title`). **Don't have the names yet?** Company-first
discovery is now in the API (BETA, Team/Enterprise): `search_accounts({ companies, titles })` starts a
search → poll `list_pool` (by its `campaignId`) → `confirm_pool` the good people into targets → then
`find_top_paths` for warm intros to them.

### 3. 🟡 Build a target list from my ICP description
Closer now. If your ICP is "these roles at these companies", `search_accounts({ companies, titles })`
(BETA) discovers matching people into the pool → `confirm_pool` them into targets. You still bring the
company list and the titles (there's no free-text-ICP → company inference yet), and you can
`import_targets` known LinkedIn URLs directly. Generating the company/target list from a pure text ICP
remains a roadmap item.

### 4. ✅ See if teammates are connected to prospects without them doing anything
`get_target_connections` (or `find_top_paths`) returns `owners` — the team members whose network
each path comes from. Filter by `ownerIds` to focus on specific teammates. They must be in the same
Draftboard org with their networks already scanned.

### 5. ✅ Map paths through my colleagues' networks (mine is weak)
`find_top_paths` with `ownerIds` set to your colleagues' team member ids. Get those ids from `get_me`
— `customer.teamMembers[]` is the roster, each with a name and the `id` you pass as `ownerIds`.
(Connections also carry an `owners[]` list showing which teammates can make a given intro.)

### 6. ✅ Exclude connections I'm not close enough to ask
Rate them ★: `set_connector_tier` with `rating: 1` ("don't ask") drops that connector from warm-path
results and hides them from the default `list_supporters`. Review who you hid with
`list_supporters({ ratings: [1] })`, and undo by rating them higher (or `tier: 0` to clear).
`set_connector_excluded` (`excluded: true` / `false`) is the legacy equivalent of the same state and
still works. (WRITE — the host approves the call.)

### 7. ✅ Mark my closest connections and only see paths through them
Closeness is a **star rating, 1..5, higher is better**: **5 = ★★★★★ "ask anytime" (closest)**, down to
**1 = ★ "don't ask"**. **Set** it with `set_connector_tier` (`rating: 5` = closest, `rating: 1` =
don't ask, `tier: 0` = clear the rating) — this is how you "rate" or "prioritize" a supporter
(WRITE — host-approved). **Read** it back with `list_supporters`: every supporter carries its
`rating`, and `ratings: [5]` (or `[4,5]`) is "only my warmest". Note that `rating: 1` also **hides**
the connector, so the default listing omits them — `ratings: [1]` is how you review who you hid.
Higher-rated connectors are prioritized in ranking, so "only see paths through my closest" ≈ work
from that filtered `list_supporters`. `tier` (0..5, counting down — `tier = 6 - rating`) is the same
value on the raw wire scale and still works everywhere; send exactly one of the two.
`set_connector_preferred` is the legacy star flag (`preferred: true` ≈ `rating: 5`).

### 8. ✅ Am I already connected to the prospects I upload?
`check_if_connected` with the LinkedIn URLs. Returns per-URL `directlyConnected` (true when you/a
teammate already know them directly — `degree` "1st"), `hasPaths`, `pathsCount`, `topConnector`,
`topRank`. Newly uploaded people may need a moment for enrichment.

### 9. ✅ Show me my top paths right now
`find_top_paths` (defaults to status `new`, sorted by connector `rank`). This is the headline use
case — keep it scoped with `tagNames`/`minTargetMaxRank` on large lists.

### 10. ✅ Cold email that name-drops a mutual connection
`find_top_paths` with `includeRankDetails: true`. For the chosen target, take the top connector and
weave a real `rankDetails` fact ("you both worked at Apalon") into the opener. Only use facts the
tool actually returned.

### 11. ✅ Track and update the status of requested intros
`intro_status_overview` → counts of `new` / `completed` / `stopped`, optionally per tag. You can also
**drive** an intro's lifecycle with `set_intro_status` (`requested` → `completed` / `declined`, with
an optional decline reason). (WRITE — host-approved.)

### 12. 🟡 History of my intro requests to a given connection (last asked, hit rate, responsiveness)
`get_connector_intros` shows the current connector-first view — everyone a given connector can
introduce you to. But per-connector **history/analytics** (last asked, response rate, hit rate) is
not exposed by the Integration API — that remains a roadmap item.

### 13. ✅ Prioritise the connectors who actually work with the target right now
When several connectors can reach the same target, lead with the ones whose tie is *current*.
`find_top_paths` (or `get_target_connections`) returns `relationships` per opportunity — zero or more
of `current_colleague`, `former_colleague`, `university_classmate` — plus `relationshipDetails`, the
structured records behind the shared history (shared `employment` with an overlap window, shared
`education`, or `mutualConnections.count`). Sort your shortlist so `current_colleague` comes first,
then `former_colleague` with the most recent `overlapEndDate`, then the rest, and open the ask with a
fact you can point at ("you two are both at Acme in Engineering").

**But read the silence correctly.** Both keys are **absent when empty**, and empty is the majority
case — most scored relationships predate the structured model and there is no backfill. A connector
without `relationships` is **not** a connector without a relationship; it is one whose tie we haven't
classified. So use this to *promote* the ones that carry a current-colleague signal, never to demote
or hide the rest, and always fall back to `scoreDetails` for the warm line (present far more often than the structured fields, but read it as `scoreDetails ?? []` — it is omitted when empty too). Say what
you sorted on, e.g. "3 of these 12 are flagged as current colleagues — the other 9 aren't classified,
not disqualified."

---

**Coverage honesty.** Outcome tools return a `telemetry` block. Always tell the user what was
actually scanned (e.g. "top 25 of 142 targets") and, when `truncated` is true, offer the
`nextSuggestedFilter`. Don't present a partial scan as exhaustive.
