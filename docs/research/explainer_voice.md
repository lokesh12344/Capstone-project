# Viva explainer: Offline Voice-Based Khata Entry (final report)

Matches `final/Voice_Khata_Proposal.pdf` exactly: 12 speakers, 360 clips, 3 setups, 10-person usability test, 4 hypotheses, ₹11,000, 12 weeks. Reference numbers [n] below are the report's numbers.

---

## 1. The whole study in 5 sentences

1. Shopkeepers find it slow to type khata entries at a busy counter. Speaking ("Ramesh ko 500 udhaar") is faster, but most speech recognition needs internet.
2. We test whether a free model, Whisper, running fully offline on a cheap Android phone, can pick out the name, the amount and credit-or-repayment. The speech can be Hindi, Marathi, English or a mix.
3. We record 360 short commands from 12 speakers. We run each one through three setups: a cloud service, offline Whisper (8-bit), and offline Whisper given the shop's customer names as a hint.
4. We judge each setup by whether the whole entry is right, and by our own new measure, the **Rupee Error Rate**: rupees put in the wrong place per 100 entries. We also check how badly word error rate misjudges money errors.
5. Then 10 people enter 5 entries by voice and 5 by typing. We compare their times and SUS usability scores.

---

## 2. The wow factor: Rupee Error Rate (RER)

### The problem it fixes

Word error rate (WER) counts every wrong word the same. For a khata, only money matters.

Spoken: **"Ramesh ko 250 udhaar"** (Ramesh, ₹250, credit). Each output below has 1 of 4 words wrong, so WER is 25% for all three (Fig. 1 in the report):

| Output | What's wrong | Money error |
|---|---|---|
| "Ramesh **ka** 250 udhaar" | filler word | ₹0 |
| "Ramesh ko **200** udhaar" | amount | ₹50 |
| "**Suresh** ko 250 udhaar" | customer | ₹500 |

Same WER, completely different damage.

### The rule (say it like this)

"We compare every customer's balance change with what it should have been, and add up how far off it is."

- **Right customer, wrong amount:** the difference. 250 heard as 200 gives ₹50.
- **Wrong customer:** the amount is missing from the right person *and* wrongly added to someone else. So it counts twice: 2 × 250 = ₹500.
- **Credit and repayment swapped:** the balance moves the wrong way. The customer should go +500 but goes −500, a gap of 2 × 500 = ₹1,000.

**RER = total money error ÷ number of entries × 100**, read as "₹ wrongly recorded per 100 entries".

### Worked example (Table 6 in the report; illustrative, not results)

| Spoken | Recorded | Wrong | ₹ error |
|---|---|---|---|
| Ramesh, 500, credit | same | nothing | 0 |
| Sunanda, 250, credit | Sunanda, 200, credit | amount | 50 |
| Iqbal, 500, repayment | Iqbal, 500, credit | type swapped | 1,000 |
| Meena, 300, credit | Mehul, 300, credit | wrong customer | 600 |
| Anil, 1,000, repayment | same | nothing | 0 |

- Total money error: ₹1,650 over 5 entries.
- RER = 1,650 ÷ 5 × 100 = **₹33,000 per 100 entries**.
- Whole entries correct: 2 of 5 = 40%.

### Why it's new

- Wang et al. (2003) [11] and Gordeeva et al. (2021) [15] showed that WER doesn't match task accuracy.
- Nobody has weighted speech errors by money.
- It is measured *before* the confirm screen, so it shows the risk if the shopkeeper doesn't check.

### Second feature: the customer-name hint

- We give Whisper the shop's customer names before it listens, so uncommon names like "Sunanda" are heard right.
- It's tested as a before/after comparison (H2).

---

## 3. Literature in time order (what to say for each period)

| Period | Papers | One line to say |
|---|---|---|
| 2003–2010: word errors and voice for low-literacy users | Wang 2003 [11], Morris 2004 [12], Medhi 2007 [3], Patel 2010 [4] | "WER was already known to be imperfect, and voice suited low-literacy users, but there was no real speech recognition yet." |
| 2019–2021: mixed languages and judging by details | Sitaram 2019 [13], Bastianelli 2020 SLURP [14], Diwan 2021 MUCS [9], Gordeeva 2021 [15] | "Mixed Indian speech is hard, and you should judge the extracted details, not just words, but no money-based measure exists." |
| 2022–2024: large multilingual and Indian models | Javed 2022 [16], Radford 2023 Whisper [5], Bhogale 2023 Vistaar [6], Gandhi 2023 Distil-Whisper [17], Javed 2024 IndicVoices [7] | "Big models and big Indian datasets arrived, but they're tested on general speech and big hardware." |
| 2025–2026: adapting Whisper to Indian speech and small devices | Tripathi 2025 [18], Biswas 2025 [10], Söhler 2026 [19] | "Whisper is being shrunk and tuned for Indian and mixed speech, but on English or servers, not cheap phones, and never scored in rupees." |

**The gap in one breath:** "Nobody has tested offline recognition on a cheap phone for mixed Hindi–Marathi–English khata commands, judged by the money it gets wrong."

---

## 4. Every technical term

| Term | Plain meaning | Example | Why we use it |
|---|---|---|---|
| Khata entry | who, how much, credit or repayment | Ramesh, ₹500, repayment | what we capture |
| ASR (speech recognition) | speech → text | "Ramesh ne paanch sau diye" | step 2 |
| Cloud service | ASR on Google's servers, needs internet | Google Speech-to-Text | best-case baseline |
| Offline / on-device | runs on the phone, no internet | Whisper in the app | shops lose network |
| Whisper | free OpenAI model, 680,000 h of training audio [5] | "small" size | supports Hindi and Marathi, no training needed |
| Quantisation / 8-bit | store the model's numbers with fewer bits | about 4× smaller | fits on a 2–3 GB phone; 8-bit kept accuracy in [19] |
| whisper.cpp | free program that runs Whisper on phones | called from the app | practical runtime |
| Code-mixing | several languages in one sentence | "Ramesh ka 250 ka udhaar add karo" | how people actually talk |
| Extraction rules | turn text into name, amount and type | "paanch sau" → 500; "udhaar" → credit | simple, offline, explainable |
| Number words | amounts said as words | "dhai sau" = 250, "saade teen hazaar" = 3,500 | the main error source |
| Closest-name matching | pick the nearest customer name | "Sunandha" → Sunanda | transcripts rarely spell names exactly |
| Name hint (prompt) | text given to Whisper before listening | "Ramesh, Sunanda, Iqbal…" | better name accuracy (H2) |
| Confirm screen | shows the entry before saving | "Sunanda · ₹3,500 · Repayment → Save" | money is never saved blindly |
| Ground truth | the correct answer | we wrote the cards | no labelling needed |
| WER | share of words wrong | 1 of 4 = 25% | supporting only |
| **RER** | ₹ wrongly recorded per 100 entries | see Section 2 | our main new measure |
| Whole entry correct | name, amount and type all right | 2 of 5 = 40% | main accuracy measure |
| Time on phone | end of speech to result on screen | e.g. 2.5 s | is offline fast enough? |
| SUS | 10-question usability form, 0–100 [20] | once for voice, once for typing | standard and short |
| Counterbalancing | half start with voice, half with typing | person 1 voice first, person 2 typing first | practice doesn't favour one method |
| Paired design | same clip or person under both conditions | each clip goes through all 3 setups | fair; needs fewer samples |
| Power | chance the study detects a real difference | 80% | justifies the sample size |
| Null hypothesis | the "no difference" claim | "cloud = offline" | what we try to reject |
| p < 0.05 | a difference this large is unlikely to be luck | p = 0.02 | standard cut-off |
| DPDP Act 2023 | India's data protection law [21] | consent, clips stored as "S07" | voice is personal data |

**SUS scoring, if asked:**
- Odd questions: answer − 1. Even questions: 5 − answer.
- Add the ten results and multiply by 2.5. About 68 is average.

---

## 5. Hypotheses and tests

| | What it checks | Test | We're wrong if… |
|---|---|---|---|
| H1 | Cloud gets more whole entries right than offline | McNemar | no real difference (good news for offline) |
| H2 | Name hint improves name accuracy | McNemar | the hint doesn't help |
| H3 | WER is only a weak guide to money error (correlation < 0.5) | Spearman rank correlation | the correlation is 0.5 or more, i.e. WER is good enough |
| H4 | Voice is faster than typing | Wilcoxon signed-rank | typing is as fast or faster |

**Explaining each test in one breath:**
- **McNemar.** "Same clip, two setups. We ignore clips both got right or both got wrong, and check whether one wins the disagreements far more than 50-50." Example: 40 vs 15 disagreements means a real difference; 28 vs 27 doesn't.
- **Spearman.** "We rank all clips by WER, and separately by rupee error, and check whether the two orders match. 1 means WER predicts money error perfectly; near 0 means it doesn't predict it at all."
- **Wilcoxon.** "For each person, voice time minus typing time. We check whether 'voice faster' clearly outweighs 'typing faster'. No bell curve needed."

**Sample size, if asked:**
- **360 clips:** 80% power to catch a gap of about 5–6 percentage points between setups, assuming they disagree on about 10–12% of clips.
- **Spearman on 360 clips:** the 95% interval is about ±0.1, which is narrow enough to tell whether the correlation is below 0.5.
- **10 people, paired:** 80% power for a large difference (effect size about 1). An example is voice saving around 10 seconds per entry when times vary by about 10 seconds.

---

## 6. Likely viva questions

1. **"What is new in your research?"** The Rupee Error Rate. We score speech errors by the money they put in the wrong place, not by word count, and we test it on offline, mixed-language khata commands on a cheap phone.
2. **"Why not just use Google's cloud?"** We do, as the comparison. But the app must work without internet, so the question is how close offline gets.
3. **"Isn't RER just WER with extra steps?"** No. Three outputs with the same 25% WER have money errors of ₹0, ₹50 and ₹500. H3 tests exactly this.
4. **"Why does a wrong customer count double?"** One person loses the entry and another wrongly gets it. Two accounts are wrong by the full amount.
5. **"RER depends on the amounts on your cards."** True, so we report it next to "whole entry correct %", and our cards use realistic amounts from SmartOps data.
6. **"360 clips is tiny."** It's small for *training* but fine for *testing*. Every clip goes through every setup, so comparisons are paired.
7. **"Why 10 people?"** Each person uses both methods, so we compare people with themselves. That's normal for a first usability check, and it has 80% power for a large difference.
8. **"Most speakers are students."** Yes, and it's listed as a limitation. We include 4 shopkeepers and report their results separately.
9. **"Why Whisper small?"** Bigger models don't fit or are too slow on a 2–3 GB phone. If small is too slow, we try the next smaller size and report it.
10. **"Why rules, not ChatGPT?"** Rules work offline, are fast, and are easy to check.
11. **"Doesn't the confirm screen defeat the purpose?"** No. Checking one line is faster than typing, and it keeps money safe. RER shows the risk if someone doesn't check.
12. **"Why is your literature in time order?"** It shows each era fixing what the last couldn't: voice suits users → mixed-language data → big models → small Indian-tuned models. The last step, scoring in rupees on cheap phones, is our part.
13. **"Why McNemar and not chi-square?"** Chi-square assumes separate groups. Ours are paired (same clip, two setups), and McNemar is chi-square's paired version.
14. **"Privacy?"** Made-up names and amounts, consent forms in three languages, clips stored as codes, deleted after the project, and an opt-out for sending clips to Google. We follow the DPDP Act 2023.
15. **"Is there IP potential?"** Possibly: the RER method and the name hint for khata entry. We'd check with the institute's IP cell before any public release.

---

## 7. One-minute pitch

"Shopkeepers find typing khata entries slow at a busy counter. Speaking is faster, but speech recognition usually needs internet. We're testing whether a free model, Whisper, running fully offline on a cheap Android phone, can get the name, the amount and credit-or-repayment right, even when people mix Hindi, Marathi and English. The new part is how we judge it. Word error rate counts every word the same, but a wrong filler word costs nothing and a wrong amount costs money. So we measure the Rupee Error Rate: how many rupees end up in the wrong place per 100 entries. We'll record 360 commands from 12 people and compare offline Whisper against a cloud service, with and without a customer-name hint. Then 10 people try voice versus typing. The output is an offline voice feature in our app SmartOps, and an honest answer, in rupees, on how well it works."
