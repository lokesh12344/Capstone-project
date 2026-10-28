# Viva explainer: Proposal 1 (Sync methods in SmartOps)

Proposal: `Research_Proposal_1_Sync_Methods.pdf` (source: `src/proposal1.md`)

---

## 1. The whole study in 5 sentences

1. SmartOps saves every khata entry on the phone first and syncs it with the server later, so the shop can keep working without internet.
2. When syncing, each phone asks the server "give me everything newer than my last sync", but "newer" is judged by the time written *on the phone* when the entry was created, not the time the server received it.
3. So an entry made offline and uploaded later can be older than another phone's last sync, and that phone never downloads it. Two phones then show different balances for the same customer.
4. We will compare three ways of marking records: phone time (current), a server timestamp, and a server counter (sequence number). We test them with a Node.js script that acts as three phones going offline and online against our real backend, for 180 runs.
5. We measure records missed, rupee mismatch, sync time and data size, check the differences with a chi-square test and a Kruskal–Wallis test, and recommend one method.

---

## 2. Where the bug is in our code (show this if asked "prove it")

| Step | File and line | What it does |
|---|---|---|
| Phone saves an entry | `SmartOps/src/database/actions.js:328` and `:340` | `const now = Date.now()` on the phone, then `e.updatedAt = now` |
| Credit sale, same thing | `SmartOps/src/database/actions.js:139` and `:188` | Same phone clock written into `updated_at` |
| Phone sends its bookmark | `SmartOps/src/sync/syncEngine.js:146` | `/sync/pull?last_pulled_at=...` |
| Server reads the bookmark | `backend/src/controllers/syncController.js:12` | `since = last_pulled_at` |
| Server sets the next bookmark | `syncController.js:13` and `:102` | `now = Date.now()` on the server, returned as `timestamp` |
| Server filters by phone time | `syncController.js:96` (and 24, 39, 51, 63, 74, 84) | `WHERE ... updated_at > $2` |
| Server stores phone time unchanged | `syncController.js:248` | `e.updated_at ?? now`, where the phone's value wins |
| Same for products, batches, customers | `syncController.js:160, 176, 210` | `updated_at = EXCLUDED.updated_at` |
| Rounding: phone reads a decimal | `SmartOps/src/screens/KhataScreen.js:68`, `NewOrderScreen.js:154` | `parseFloat(...)`, so 99.999 is allowed |
| Rounding: server rounds | `backend/src/db/migrate.js:136` | `amount NUMERIC(10,2)` keeps 2 decimals |

The bug in one line: **the bookmark is in server time, but the thing it is compared with is in phone time.**

---

## 3. Traced example: how the record gets lost

Shop with two phones. All clocks are correct. Before 10:00 both phones are fully synced, and both have bookmark = 10:00.

### Current method (phone time)

| Time | Phone A | Server | Phone B | Result |
|---|---|---|---|---|
| 10:00 | Synced. Bookmark = 10:00 | Has all old records | Synced. Bookmark = 10:00 | Everyone agrees |
| 10:05 | Loses network | | | |
| 10:20 | Saves repayment R: "Ramesh paid ₹500". `updated_at = 10:20` (phone clock). Stored only on A | Doesn't know about R | | |
| 10:30 | | Gets B's pull: "records with updated_at > 10:00". Finds none. Replies with bookmark = 10:30 | Pulls. Gets nothing. **Bookmark = 10:30** | B is fine for now |
| 10:50 | Network back. Pulls (> 10:00): nothing new. Then **pushes R** | Stores R with **updated_at = 10:20** (phone's value) | | R is now on the server |
| 11:00 | | Gets B's pull: "records with updated_at > 10:30". R has 10:20, so **R is not sent** | Pulls. Gets nothing. Bookmark = 11:00 | **B misses R** |
| 11:30, 12:00 ... | | Every later pull asks for > 11:00, > 11:30 ... | R is never sent | **Lost for B permanently** |

Effect: Phone B still shows Ramesh owing ₹500 more than he does. A (and the server/dashboard) show the right amount. The only way B would ever see R is a full re-download from zero.

### Same story, server timestamp method

| Time | What changes |
|---|---|
| 10:50 | Server receives R and **overwrites** `updated_at` with its own clock: 10:50 |
| 11:00 | B asks for > 10:30. R has 10:50, so **R is sent**. Fixed |

### Same story, sequence number method

| Time | What changes |
|---|---|
| Before | The server's counter is at 57. B's bookmark = 57 (the highest number it has seen) |
| 10:50 | Server stores R and gives it the next number: **58** |
| 11:00 | B asks for "numbers greater than 57". R is 58, so **R is sent**. Fixed |

### Even without going offline, a small window exists (current method)

SmartOps waits 1.5 s after a write before syncing (`syncAfterWrite(1500)`, `syncEngine.js:187`).
- A saves R at 10:20:00.0, so `updated_at` = 10:20:00.0.
- B happens to pull at 10:20:01.0 and gets bookmark 10:20:01.0.
- A pushes at 10:20:01.5. R's time (10:20:00.0) is older than B's bookmark, so **B misses it**.

This is why we expect misses even with short offline periods.

### The rare case that can still hit the server methods

- A's push is being saved at the same moment B's pull is reading.
- The server stamps R at 10:50:00.050, but the save only finishes at 10:50:00.150.
- B's pull started at 10:50:00.100, so it didn't see R and gets bookmark 10:50:00.100.
- Next time B asks for > 10:50:00.100, and R (10:50:00.050) is skipped.

This window is milliseconds wide, so it should be very rare. We will count it and not hide it. The usual fix is to re-ask for the last few seconds on every pull; that is future work.

### The rounding example

- A shopkeeper types a repayment of 99.999. The phone stores 99.999 and the server stores 100.00.
- Phone A never re-downloads its own record, so A says 99.999 and B/server say 100.00.
- The gap is ₹0.001, which is small but real.
- Fix: store amounts in paise as whole numbers (10000 paise = ₹100).

A detail worth knowing: with the two server methods, A's own record comes back to A once.
- R gets a server time (10:50:00.2) that is newer than A's bookmark from the pull just before its push (10:50:00.0).
- So on A's next pull, R is downloaded again with the rounded 100.00, and A's rounding gap disappears too.
- The cost is a slightly bigger download, and that is exactly why we measure payload size.

---

## 4. Every technical term, explained from the problem outward

| Term | Plain meaning | SmartOps example | Why we used it |
|---|---|---|---|
| **Offline-first** | The app saves to the phone first and talks to the server later | A sale during a network drop is saved and shown immediately | Kirana shops can't stop billing when the signal drops |
| **Sync** | Making the phone's copy and the server's copy match | Runs after every write and when the network comes back | This is where the bug lives |
| **Pull** | Phone downloads changes from the server | `GET /api/sync/pull?last_pulled_at=...` | Half of sync |
| **Push** | Phone uploads its own new or changed records | `POST /api/sync/push` | The other half |
| **Bookmark / cursor / `last_pulled_at`** | The point a phone says "I have everything up to here" | B's bookmark = 10:30 in the example | The three methods are three ways of choosing this bookmark |
| **`updated_at`** | A column saying when a record last changed | Set to `Date.now()` on the phone | It's the field the pull filters on |
| **Phone time (client time)** | The phone's own clock | 10:20 in the example | Current method; tells *when written*, not *when the server got it* |
| **Server timestamp method** | Server ignores the phone's time and writes its own when it receives the push | R becomes 10:50 | Simplest fix, a few lines of code |
| **Sequence number** | A counter on the server that goes up by 1 for each stored record, like a bank token number | R gets token 58 | Never goes backwards, never gives two records the same number |
| **Clock problem (Lamport)** | Different machines' clocks can't be trusted to order events | Phone clock could even be set wrong by hand | The theory behind why phone time is the wrong thing to compare |
| **Local-first software** | The idea that the main copy of data lives on the user's device | SmartOps is built this way | Places our app in known research |
| **WatermelonDB** | The database library in our React Native app; it also provides the sync framework | `synchronize()` in `syncEngine.js` | Its docs advise server time, which supports our argument |
| **PostgreSQL** | The server database | Stores everything in `ledger_entries` etc. | The "truth" we compare phones against |
| **Docker** | Runs PostgreSQL in an isolated container on a laptop | A fresh database for each run | Keeps tests away from the live AWS data |
| **`SYNC_MODE` switch** | A setting that picks one of the three methods | `SYNC_MODE=seq` | Same code, change one setting, fair comparison |
| **Simulator** | A Node.js script pretending to be 3 phones | Phones A, B, C doing sales and repayments on a schedule | Can repeat 180 times; real phones can't |
| **Time compression** | 1 real second = 1 minute in the shop | A "2 hour" offline period takes 2 real minutes | The bug depends on *order*, not duration, so this is fair and fast |
| **Run** | One 4-hour shop day with 3 phones under one method and one offline duration | Run #37: sequence method, 30 min offline | The unit we repeat 20 times per combination |
| **Independent variable** | What we change on purpose | Sync method; offline duration | Causes |
| **Dependent variable** | What we measure | Missed %, ₹ mismatch, sync time, payload | Effects |
| **Controlled variable** | Kept the same so it can't explain differences | Always 3 phones, same workload, same server | Fairness |
| **Records missed (%)** | Records on the server but missing on at least one phone ÷ all records | 3 missing out of 200 = 1.5% | Main correctness measure |
| **Balance mismatch (₹)** | How far each phone's customer balances are from the server's, added up | B shows Ramesh ₹500 more, so mismatch = ₹500 | Puts the bug in money terms a shopkeeper understands |
| **Sync time** | How long one pull + push takes | e.g. 120 ms | Checks the fix doesn't slow things |
| **Payload size** | How many KB sent and received per sync | e.g. 4 KB | Checks the fix doesn't waste mobile data |
| **Float vs NUMERIC(10,2)** | Phone keeps any decimals, server keeps exactly 2 | 99.999 → 100.00 | The small paise-level mismatch |
| **Paise as integers** | Store ₹100.00 as 10000 | Proposed fix for rounding | No decimals means no rounding |
| **Race condition** | Two things happen at nearly the same moment and the order decides the outcome | Push saving while a pull reads | Explains why server methods might still miss very rarely |
| **Null hypothesis** | The "nothing interesting" claim we try to reject | "All methods miss the same %" | Standard way to test a claim |
| **p-value / 5% level** | Chance of seeing a difference this big if the null were true; below 0.05 we reject the null | p = 0.001, so the methods really differ | Standard cut-off |
| **Chi-square test** | Checks whether proportions differ between groups, using counts | Missed vs delivered counts for 3 methods | Our data for H1 is counts |
| **Kruskal–Wallis test** | Compares 3+ groups by ranking all values, without assuming a bell curve | Missed % for 5 min vs 30 min vs 2 h | Many runs will be 0, so the data won't be bell-shaped |
| **Median, box plot** | Middle value; a chart showing spread | Median sync time per method | Simple, robust summary |
| **SDG 8.3 / 9.c** | UN goals: support small businesses; access to ICT | Reliable digital khata for kiranas | Rubric asks for SDG link |

---

## 5. Hypotheses and tests

| | What it checks (one line) | Test | What result would prove us wrong |
|---|---|---|---|
| **H1** | Do the three methods miss different shares of records? | **Chi-square** on a 3 × 2 table (method × missed/delivered) | p ≥ 0.05, meaning the phone-time method misses no more than the server methods |
| **H2** | Under the current method, does longer offline time mean more misses? | **Kruskal–Wallis** on missed % per run, groups = 5 min / 30 min / 2 h | p ≥ 0.05, or the 2 h group isn't higher |
| **H3** | Do the fixes make sync slower? | **Kruskal–Wallis** on median sync time per run, groups = 3 methods | A significant difference *with* the new methods more than 10% slower in median |

How to explain each test in one breath:
- **Chi-square.** "We count how many records each method delivered and missed. We work out how many misses each method *would* have if they were all equal, and the test says whether the real counts are too far from that to be luck."
- **Kruskal–Wallis.** "We line up all runs from smallest to largest miss %, give them ranks, and check whether one group's ranks are consistently higher. It's like a t-test for three groups, but it doesn't need a bell curve."

---

## 6. Likely viva questions, with short spoken answers

**1. Isn't this just a bug fix? Where's the research?**
The fix itself is small. The research is in measuring it. We don't know how often the bug hits, how it grows with offline time, how much money it puts out, or whether the fixes cost anything. We test those with a controlled experiment and hypotheses, the same way you'd evaluate any design choice.

**2. Why not just use Firebase?**
Firebase would handle sync for us, but it's a paid, closed Google service: data sits on Google's servers, costs grow with use, and we can't see or change how it syncs. SmartOps uses an open-source stack we control. Also, our question applies to anyone using pull/push sync, which is a very common pattern. Switching tools would avoid the question, not answer it.

**3. How is 20 runs enough?**
For H1 we test records, not runs. Each run creates about 150–250 records, so each method has around 10,000 records, which is plenty for a chi-square test. For H2 and H3, Kruskal–Wallis works fine with 5 or more values per group, and we have 20. If a result is borderline, we add runs; they're cheap.

**4. Why not a real field study in shops?**
We can't control when a shop's phones go offline, it would take months to see enough cases, and we'd be risking real customers' money records. A simulation lets us repeat the exact situation 180 times safely. We do check the key scenario on two real phones to make sure the simulator matches reality.

**5. Is compressing time (1 second = 1 minute) cheating?**
No. The bug depends only on the order of three events: A writes, B pulls, A pushes. Compressing time keeps the order the same, so the result is the same, just faster.

**6. Why these three offline durations?**
5 minutes is a short network drop, 30 minutes is a bad patch, and 2 hours is something like a power cut or a dead phone battery. They cover typical real situations and let us see a trend for H2.

**7. What about phones with the wrong time set?**
That would make the current method even worse, because a phone set behind would stamp records as "older" still. We kept clocks correct to keep the design simple, so our numbers are, if anything, an underestimate. Wrong clocks are listed as future work.

**8. Why not use CRDTs or hybrid logical clocks?**
They solve harder problems, like two people editing the same record at once. Our khata entries are never edited after they're written, so we only need every record to *arrive*. A server sequence number is the simplest thing that solves exactly our problem.

**9. Can the server methods still miss records?**
Very rarely, yes: if a push is being saved at the exact moment a pull reads (a few milliseconds). We will count those cases honestly. The standard fix is to re-ask for the last few seconds on every pull, which we list as future work.

**10. Why chi-square and not a t-test?**
For H1 our data is counts: records missed or not. That's what chi-square is for. A t-test compares averages of two groups with roughly bell-shaped data, and we have three groups with lots of zeros.

**11. How do you know the simulator behaves like the real app?**
It uses the same HTTP pull and push requests as the app, against the real backend code. We also run the Figure 1 scenario on two real phones with each method and check that the outcome matches.

**12. What if all three methods turn out the same?**
Then H1 is rejected. That would itself be useful: it would mean the bug is rare in practice. We'd report it honestly. From the code trace, though, we expect a clear difference.

**13. Why does the balance mismatch matter if the server is correct?**
Because the shopkeeper looks at the phone, not the server. If the helper's phone says Ramesh owes ₹500 more, they might ask him to pay twice. That's a real trust problem.

**14. Is there any ethical issue?**
No people take part and all data is made up, so there's no personal data. We still follow our guide's rules, keep the code private, and cite everything.

**15. What's the one thing you'll recommend?**
Probably the server sequence number: it never goes backwards and two records never share a number. If the timing and data costs are the same as server time, it's the safer choice.

---

## 7. One-minute pitch

"Our app SmartOps lets kirana shops record khata offline and sync later. We found that it decides what other phones should download using the time on the phone that created the entry. So if the owner's phone saves a ₹500 repayment offline at 10:20 and uploads it at 10:50, the helper's phone, which already synced at 10:30, never downloads it. The two phones then disagree about what the customer owes. We want to measure how often this happens and whether two simple fixes solve it: letting the server stamp its own time, or giving each record a server counter number. We'll write a Node.js script that acts as three phones going offline and online against our real backend. We'll run 3 methods times 3 offline durations, 20 runs each, and measure missed records, the rupee gap and sync cost, using a chi-square and a Kruskal–Wallis test. The result is a tested recommendation for SmartOps and a test script others can reuse."
