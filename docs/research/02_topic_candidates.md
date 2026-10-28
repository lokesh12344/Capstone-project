# Phase 2 — Candidate Research Topics

## Revision 2 (2026-09-21): sharper, reviewer-facing framings

Context: this is a proposal only (not for publication), so the priority is a topic that sounds novel and is well grounded in existing literature. The methodology still has to be credible, but it doesn't need to be run in full.

| # | Title | Hook (why it impresses) | Literature base | Built from |
|---|---|---|---|---|
| **R1 (recommended)** | **Local-First Khata: Invariant-Aware, CRDT-Based Synchronisation for Informal Credit Ledgers under Intermittent Connectivity** | Combines several current research ideas: local-first software, CRDTs, hybrid logical clocks, invariant confluence, and TLA+ model checking (a formal method for proving protocol properties). A TLA+ model *finds* the missed-update bug in SmartOps' real protocol, and a corrected design is proposed and evaluated by simulation. | Kleppmann et al. 2019 (local-first); Shapiro et al. 2011 (CRDTs); Bailis et al. 2015 (I-confluence) ✔; Kulkarni et al. 2014 (HLC) ✔; Lamport (TLA+); Go et al. 2015 ✔ | T1 + T2 + T5 merged |
| R2 | **Voice-First Offline Bookkeeping: On-Device Speech-to-Ledger for Code-Mixed Hindi/Marathi Kirana Transactions** | Very current: small speech-recognition models running on low-end phones, Indic languages and low-literacy users. Research question: can a small on-device model turn "Ramesh ko 250 udhaar" into a correct ledger entry offline, and how does it compare with cloud speech recognition on accuracy, latency and memory? | Radford et al. 2022 (Whisper); AI4Bharat IndicWhisper/Vistaar 2023; UTAUT; code-mixed speech-recognition work | New feature on the SmartOps khata |
| R3 | **Crash-Consistent Offline Financial Records on Low-End Android: Durability of JS Offline-First Storage** | Measures real data loss when the phone kills the app. | Kim et al. FAST 2012; Jeong et al. ATC 2013; Go et al. 2015 ✔ | T3 |

**Recommendation: R1.** It uses the most sophisticated ideas, has deep literature to build on, and is derived directly from your real code. It needs zero budget, and it keeps well clear of credit scoring. R2 is the choice if you want the "AI + Bharat" angle, which is flashier. It needs a small recorded speech dataset, but in a proposal that only has to be described.

---

## Revision 1 (original candidates)

All candidates use SmartOps as the **testbed/instrument**, not the subject. Each is derived from a concrete property found in Phase 1 (`01_codebase_findings.md`, section refs §3.x). Credit scoring / creditworthiness is excluded (overlaps the Honours project).

Papers in the *Novelty* rows are real works I'm confident of. Items marked ✔ were confirmed by web search in this phase; the rest get formal verification (page fetch, authors/venue/year) in Phase 3, and anything that fails is dropped.

SDG shorthand: **8.3** (MSME formalisation and growth), **8.10** (access to financial services), **9.3** (small enterprises' access to financial services / value chains), **9.c** (access to ICT), **10.2** (inclusion).

---

## T1. Change-tracking cursor strategies for offline-first pull/push sync *(from §3.1, §3.6)*

| Field | Detail |
|---|---|
| **Title** | Replication Completeness and Ledger Consistency in Offline-First Mobile Sync: An Experimental Comparison of Change-Tracking Cursor Strategies under Intermittent Connectivity and Clock Skew |
| **Research question** | How does the choice of change-tracking cursor (client write-time vs server receive-time vs server commit-sequence vs hybrid logical clock) affect replication completeness, staleness and ledger-balance divergence across devices in a pull/push offline-first system? |
| **IV** | Cursor strategy (4 levels). **Moderators:** offline-period length, device clock skew, number of devices per shop, write rate, concurrent pushes. |
| **DV** | Replication completeness (% of server rows present on every replica after quiescence), missed-update count, time-to-convergence, staleness (ms), per-customer khata balance divergence (₹) between replicas and server, pull payload size / redundant rows. |
| **Hypothesis** | H1: Client write-time cursors (SmartOps' current design) produce a significantly non-zero missed-update rate that grows with offline duration and negative clock skew; server commit-sequence and HLC cursors achieve 100% completeness with no significant payload penalty. H0: no difference in completeness across strategies. |
| **Design** | Controlled experiment + discrete-event simulation: headless multi-device simulator speaking SmartOps' real `/sync/pull`/`/sync/push` against a local PostgreSQL; factorial design (4 strategies × offline-length × skew × devices), ≥30 seeded runs per cell; validation replay on 2 physical/emulated Android devices. |
| **Feasibility (3–4 mo, ~₹0)** | **High.** All software, runs on a laptop + existing EC2/local Postgres; the anomaly is already reproducible from the code. ~3–4 weeks to build simulator + 4 strategy variants. |
| **Novelty / gap** | Go et al., "Reliable, Consistent, and Efficient Data Sync for Mobile Apps", USENIX FAST 2015 ✔ — studied sync failures in mobile apps but in native Android frameworks pre-2015, not cursor semantics. Kulkarni et al., "Logical Physical Clocks", OPODIS 2014 ✔ — proposes HLC for datacentre DBs, not intermittently-connected mobile clients. Bailis et al., "Probabilistically Bounded Staleness for Practical Partial Quorums", PVLDB 2012 — quantifies staleness in quorum stores, not pull-cursor replication. **Gap:** no empirical quantification of cursor-induced anomalies in the timestamp-cursor pull/push protocol used by current JS offline-first frameworks, or of their financial (ledger) consequences. |
| **SDG** | 8.3, 9.c, 8.10 (reliable digital credit records for informal retail) |
| **Risk** | Low-medium. Risk: reviewers see it as "a bug fix" → mitigated by generalising to a protocol class + formal anomaly model + factorial evaluation. |

## T2. Data-model strategy vs financial-invariant preservation in offline ledgers *(from §2 hybrid model, §3.7)*

| Field | Detail |
|---|---|
| **Title** | Preserving Financial Invariants in Offline-First Retail Ledgers: Event-Sourced, State-Based and CRDT Models under Concurrent Disconnected Operation |
| **Research question** | Which data-modelling strategy best preserves ledger and inventory invariants (balance correctness, non-negative stock, sale↔receivable atomicity) during concurrent offline operation, and at what cost in payload and merge time? |
| **IV** | Data model: state-based LWW (stored balance/stock columns), event-sourced append-only (current SmartOps), CRDT (e.g. PN-counter/Automerge). **Moderators:** device count, offline duration, operation mix (sale/repayment/stock-in). |
| **DV** | Invariant-violation rate (lost updates, negative stock/oversell, balance mismatch), convergence (yes/no + time), payload bytes, merge CPU time, local query latency. |
| **Hypothesis** | H1: Event-sourced and CRDT models give zero lost updates on ledger balances, while LWW loses updates at a rate increasing with concurrency; H2: stock non-negativity is violated under all coordination-free models (it is not I-confluent), with violation rate increasing with offline duration. |
| **Design** | Invariant-confluence analysis (analytical) + simulation experiment on SmartOps' schema with 3 model implementations. |
| **Feasibility** | **High–medium.** Pure software; implementing a CRDT variant (via Automerge/Yjs) adds ~2 weeks. |
| **Novelty / gap** | Bailis et al., "Coordination Avoidance in Database Systems", PVLDB 2015 ✔ — I-confluence theory, evaluated on TPC-C in datacentres. Shapiro et al., "Conflict-free Replicated Data Types", SSS 2011 — CRDT theory. Kleppmann et al., "Local-first software", Onward! 2019 — local-first vision, qualitative. **Gap:** no empirical study applying I-confluence to informal-retail credit/stock workflows on mobile offline-first stacks. |
| **SDG** | 8.10, 9.3, 8.3 |
| **Risk** | Medium: more theory-heavy; CRDT implementation could overrun. |

## T3. Durability and performance of on-device storage adapters on low-end Android *(from §3.4, §3.5)*

| Field | Detail |
|---|---|
| **Title** | Crash Durability and Scalability of JavaScript Offline-First Storage Adapters on Low-End Android Devices: LokiJS/AsyncStorage vs SQLite |
| **Research question** | How do persistence adapters differ in data-loss window, write latency, cold-start time and database-size ceiling on low-RAM Android phones? |
| **IV** | Storage adapter (LokiJS+AsyncStorage autosave 1 s [current] / LokiJS+IndexedDB-style incremental / SQLite JSI); autosave interval; device RAM class. |
| **DV** | Records lost per forced process kill, write latency (p50/p95), cold-start time, max DB size before failure, storage write amplification. |
| **Hypothesis** | H1: Whole-blob autosave loses a non-zero fraction of acknowledged transactions under process kill and fails beyond a size ceiling; SQLite adapter loses none and has flatter latency growth. |
| **Design** | Laboratory experiment with fault injection (`adb shell am kill` at random points), repeated trials. |
| **Feasibility** | **Medium.** Needs 1–2 budget Android phones (borrowable) and native builds (Expo dev-client/EAS). |
| **Novelty / gap** | Kim, Agrawal & Ungureanu, "Revisiting Storage for Smartphones", USENIX FAST 2012. Jeong et al., "I/O Stack Optimization for Smartphones", USENIX ATC 2013. Go et al., FAST 2015 ✔ (app data loss on crash). **Gap:** prior work is native/SQLite-level; JS-runtime adapters used by React Native offline-first apps are unstudied. |
| **SDG** | 9.c, 8.3 |
| **Risk** | Medium: device variance; build tooling time; result may be "obvious" unless quantified carefully. |

## T4. Sync payload, latency and energy trade-offs under Indian mobile network conditions

| Field | Detail |
|---|---|
| **Title** | Sync Batching and Compression Trade-offs for Offline-First Retail Apps on Constrained Indian Mobile Networks |
| **Research question** | How do debounce interval, batch size and request compression affect sync completion time, data usage, success rate and battery drain on 2G/3G/4G profiles? |
| **IV** | Debounce (0.5–30 s), batch/chunk size, gzip on/off, delta vs full-row; network profile. |
| **DV** | Sync time, bytes, success rate, mAh per 100 syncs, radio-on time. |
| **Hypothesis** | Larger batches + request compression reduce energy and bytes per record with a bounded latency cost; returns diminish above a threshold batch size. |
| **Design** | Factorial lab experiment with network emulation (Android emulator netspeed / `tc netem`), Battery Historian. |
| **Feasibility** | **Medium.** Energy measurement on phones without a power monitor is noisy. |
| **Novelty / gap** | Balasubramanian et al., "Energy Consumption in Mobile Phones: A Measurement Study…", ACM IMC 2009. Huang et al., "A Close Examination of Performance and Power Characteristics of 4G LTE Networks", MobiSys 2012. **Gap:** partly incremental; would need Indian network traces to be novel. |
| **SDG** | 9.c, 7.3 (energy efficiency, weak link) |
| **Risk** | Medium-high: noisy energy data; weaker novelty. |

## T5. Sync liveness under faults: batch-atomic vs partial-acknowledgement push *(from §3.2, §3.3)*

| Field | Detail |
|---|---|
| **Title** | Liveness of Offline-First Sync under Fault Injection: All-or-Nothing Batch Push vs Chunked Partial-Acknowledgement Protocols |
| **Research question** | How do push-protocol designs affect the probability of permanent sync stall ("poison pill"), time-to-recovery and stranded-record counts under constraint violations, oversized backlogs and dropped connections? |
| **IV** | Push protocol (single-transaction [current] / chunked / per-record with quarantine), fault type and rate. |
| **DV** | Stall probability, stranded records, time-to-drain backlog, duplicate/atomicity violations. |
| **Hypothesis** | Batch-atomic push has stall probability → 1 once any poison record appears; chunked + quarantine keeps stall ≈ 0 while preserving per-order atomicity. |
| **Design** | Fault-injection experiment on the simulator from T1. |
| **Feasibility** | **High.** |
| **Novelty / gap** | Go et al., FAST 2015 ✔; Terry et al., "Managing Update Conflicts in Bayou", SOSP 1995; Kistler & Satyanarayanan, "Disconnected Operation in the Coda File System", ACM TOCS 1992. **Gap:** modest — mostly engineering; best folded into T1 as a secondary objective. |
| **SDG** | 8.3, 9.c |
| **Risk** | Medium: may read as engineering rather than research. |

## T6. Adoption and trust of offline-first digital khata among kirana shopkeepers (mixed-methods)

| Field | Detail |
|---|---|
| **Title** | Offline Capability, Trust and Intention to Adopt Digital Credit Bookkeeping among Kirana Shopkeepers: An Extended UTAUT Mixed-Methods Study |
| **Research question** | Does perceived offline reliability increase trust and behavioural intention to replace paper khata, moderated by connectivity quality and digital literacy? |
| **IV** | Perceived offline reliability, performance/effort expectancy, trust; moderators connectivity, age, literacy. |
| **DV** | Behavioural intention, SUS usability score, task success/time in a field trial. |
| **Hypothesis** | Perceived offline reliability has a significant positive effect on BI mediated by trust. |
| **Design** | Survey (n ≈ 100–150, PLS-SEM) + field usability trial with SmartOps (n ≈ 15–20) + semi-structured interviews. |
| **Feasibility** | **Low–medium.** Needs recruitment, ethics approval, incentives (~₹10–15k), translation into Marathi/Hindi. |
| **Novelty / gap** | Venkatesh et al., "User Acceptance of Information Technology: Toward a Unified View", MIS Quarterly 2003. Choudhary & Aithal, "Low-cost Technologies for Kirana (Small) Retail: A Game Changer?", IIM Kozhikode Society & Management Review 2023 ✔. **Gap:** offline reliability as a construct is absent in kirana adoption studies. |
| **SDG** | 8.3, 8.10, 10.2 |
| **Risk** | High: sample size, response bias, time; least tied to the code. |

---

## Ranking

| Rank | Topic | Why |
|---|---|---|
| **1** | **T1 — cursor strategies** | Grounded in a real, reproducible defect class; cleanly measurable DVs; factorial experiment with proper statistics; zero cost; directly uses SmartOps' real protocol and schema; clear, citable gap; financial angle (khata divergence) gives practical weight. |
| 2 | T2 — invariants / data model | Strongest theory base; excellent alternative, but CRDT implementation adds schedule risk. Its stock-invariant question can be a secondary objective of T1. |
| 3 | T3 — storage durability | Real and important for financial data, but device/tooling dependent. |
| 4 | T5 — sync liveness | Best as a sub-objective of T1 (same simulator). |
| 5 | T4 — network/energy | Noisy measurement, weaker novelty. |
| 6 | T6 — adoption study | Valuable but high recruitment/ethics risk in 3–4 months and least tied to the code. |

## Recommendation

**T1**, with T5's poison-pill liveness as a secondary objective (same simulator, one extra IV level). It gives: 1 primary IV (cursor strategy), 3 moderators, 4–5 quantitative DVs, a falsifiable H1/H0, and a design that runs on a laptop. SmartOps is the reference implementation (its current design is the baseline arm), and the outputs include a corrected sync protocol, which is a concrete contribution.
