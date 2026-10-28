# Phase 1 — Codebase Findings (SmartOps as a research instrument)

Scope read: `SmartOps/src/sync/syncEngine.js`, `SmartOps/src/database/{index,schema,migrations,actions,appInit}.js`, models, `services/api.js`, `screens/{NewOrder,Profile}Screen.js`; `backend/src/controllers/{sync,auth}Controller.js`, `db/{migrate,pool}.js`, `middleware/auth.js`, `app.js`, `routes/index.js`.

## 1. Architecture at a glance

| Layer | Implementation | Research-relevant property |
|---|---|---|
| Local store | WatermelonDB 0.28 with **LokiJSAdapter** (in-memory) persisted via a custom adapter to **one AsyncStorage key** (`@bizops_lokijs_db`), `autosave: true`, `autosaveInterval: 1000` ms (`database/index.js`) | Whole DB serialised as one string on every save. **Not SQLite** (despite `expo-sqlite` in deps and project notes saying SQLite). |
| Local schema | v4; 7 tables (products, stock_batches, stock_transactions, sale_orders, sale_items, customers, ledger_entries); client-generated UUIDv4 via `Math.random()` | IDs minted offline → no server round-trip needed for creates. |
| Sync protocol | WatermelonDB `synchronize()` → pull-then-push over HTTPS REST (`/api/sync/pull`, `/api/sync/push`) | Standard Watermelon protocol; `sendCreatedAsUpdated: false`. |
| Server | Express 4 + `pg` pool (max 20) + PostgreSQL on a t3.micro EC2 behind Nginx/TLS; PM2 | Single-node system of record. |
| Auth | JWT (HS256, 30 d, no refresh) in AsyncStorage (plaintext); server re-checks business row per request; bcrypt cost 12 | Offline > 30 d ⇒ sync fails with 401 until re-login. |

## 2. Sync mechanism in detail

**Triggers** (`syncEngine.js`): on login/app init; on every NetInfo transition to `isConnected && isInternetReachable`; 1500 ms debounce after each local write (`syncAfterWrite`); manual "Sync now"; final sync on logout. In-process mutex `_syncing` (concurrent calls are **dropped, not queued** — a write during an in-flight sync waits for the next trigger). No periodic timer, no exponential backoff, no retry on failure ("will retry on next trigger").

**Pull** (`syncController.pull`): `since = last_pulled_at`; `now = Date.now()` taken **before** 7 parallel non-transactional SELECTs of `WHERE updated_at > since`; response `timestamp = now`. All rows returned in the `created` bucket; `deleted` always `[]`; no pagination (first pull = entire tenant). Client normalises numeric/timestamp fields.

**Push** (`syncController.push`): `created ∪ updated` for every table in **one** DB transaction (all-or-nothing). Per-table semantics:

| Table | Server write | Effective conflict policy |
|---|---|---|
| products, customers, stock_batches | `INSERT … ON CONFLICT (id) DO UPDATE` (all mutable columns) | Row-level **last-arrival-wins** (not last-writer-wins by timestamp — server never compares `updated_at`) |
| stock_transactions, sale_orders, sale_items, ledger_entries | `INSERT … ON CONFLICT (id) DO NOTHING` | Append-only / immutable → grow-only set (commutative, idempotent) |
| any `deleted` | ignored | Soft-delete not implemented |

Client side, WatermelonDB's default pull conflict resolver keeps locally-changed columns over server values (column-level "local wins" for dirty records). So the system is a **hybrid**: event-sourced, conflict-free append-only logs for money/stock + state-based LWW for reference data.

**Idempotency:** retries after a lost push response are safe (upsert / do-nothing on UUID PK). 

## 3. Correctness / reliability issues found (the interesting part)

1. **Change-feed cursor uses client write-time (missed-update anomaly).** Pushed rows keep the *client's* `updated_at` (`p.updated_at ?? now`), which is the local write time — typically minutes to days *before* the push if the device was offline. Other devices pull with `updated_at > their last server timestamp`, so any row written offline and pushed after another device's last pull is **never delivered to that device**. Also affects the originating device for server-side rewrites (e.g. NUMERIC rounding). Clock skew makes it worse (device clock behind ⇒ rows invisible; ahead ⇒ repeatedly re-sent). Even a server-assigned wall-clock timestamp would still race: `now` is read before the SELECTs and concurrent push transactions may commit rows stamped `< now` after the snapshot. Correct fix class: server-assigned monotonic sequence / commit-order cursor (e.g. `bigserial`, `pg_current_xact_id` + snapshot xmin) or hybrid logical clocks.
2. **All-or-nothing push = poison pill.** One constraint violation aborts the whole batch forever. Concrete trigger: two devices create a customer with the same phone offline (different UUIDs) → `UNIQUE(business_id, phone)` fails → every later push from that device fails → all its sales/khata entries stranded locally. No per-record error reporting.
3. **Payload ceilings.** `express.json({ limit: '2mb' })` and no chunking: a long offline backlog (est. ~2 KB per multi-item sale incl. items, stock txns, customer update ⇒ order of ~1 000 sales) → HTTP 413 on every attempt. Global rate limit 200 req/15 min per IP (carrier-grade NAT shares IPs).
4. **Local durability window.** LokiJS keeps data in memory; persistence happens on a 1 s autosave that re-serialises the *entire* DB. A sale shown as "done" can be lost if Android's low-memory killer terminates the app before the flush (common on low-RAM phones). Write cost grows O(DB size) per save.
5. **Silent empty-DB fallback.** `loadDatabase` does `.catch(() => callback(null))`: any read failure (e.g. Android AsyncStorage/SQLite CursorWindow ~2 MB per-value limit as the single blob grows) yields a fresh empty database — unsynced writes silently lost, then a full re-pull.
6. **Ledger numeric divergence.** Client amounts are IEEE-754 doubles (discounted unit prices via `parseFloat`, `total = Σ qty × price`); server stores `NUMERIC(10,2)`. Server rounds, device keeps unrounded value, and (per #1) the rounded row is not re-pulled → device and server balances can differ; app hides this with a `> 0.005` guard.
7. **Invariants not coordinated.** Stock non-negativity is enforced nowhere across devices (derived stock can go negative when two devices sell the last unit offline). Khata balance is a derived sum (good: convergent by construction). Credit sale + ledger entry are written in one local `database.write` (atomic locally; atomic on server via the single push transaction).
8. **Tenant/session hygiene.** Logout clears token but not the local DB or `lastPulledAt`; a second business logging in on the same device would push the first business's pending rows under its own `business_id`. Push trusts client-supplied `product_id`/`id` (no ownership check on upsert targets) → cross-tenant overwrite possible if a UUID is known. JWT + financial data stored unencrypted in AsyncStorage.
9. **Minor:** `Math.random()` UUIDs (not crypto-grade; collision risk negligible at this scale but non-standard); customer `segment` is set client-side, recomputed server-side in analytics only.

## 4. What is instrumentable today vs. needs a harness

| Already available | Needs a small harness |
|---|---|
| Console logs: sync start/complete/fail with ISO time | Per-sync metrics: duration (pull/push split), bytes up/down, record counts per table, outcome/HTTP code → log to local file/JSON |
| `pool.query` duration logging (dev mode only) | Server-side sync telemetry table (request id, device id, rows, ms, error) |
| Morgan access logs (combined; no response time) | Switch Morgan to include `:response-time` and `:res[content-length]` |
| Deterministic, pure functions (`signedAmount`, `getStockLevels`, balance reduction) | **Headless multi-device simulator** (Node) that speaks the real `/sync/pull` + `/sync/push` protocol against a local Postgres, with configurable offline schedules, clock skew, device count, write mix |
| Postgres as ground truth (can diff tenant state vs each device replica) | Convergence checker: per-device replica vs server; lost/missing rows; ledger balance divergence; stock invariant violations |
| Android emulator / physical phone | Network shaping (Android emulator netspeed/netdelay, or `tc netem` on a Linux proxy) with Indian 2G/3G/4G profiles; process-kill injection (`adb shell am kill`) for durability tests; Battery Historian / `dumpsys batterystats` for energy |

Pluggable points for experiments: `pullChanges`/`pushChanges` callbacks (swap cursor strategy, chunking, compression), the storage adapter (`LokiJSAdapter` vs `SQLiteAdapter` with JSI), and the push transaction granularity in `syncController.push`.
