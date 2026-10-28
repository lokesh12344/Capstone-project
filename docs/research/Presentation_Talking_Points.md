# Talking points, slide by slide

Companion to `final/Voice_Khata_Presentation_v2.pptx` (16 slides). The same text is in the speaker notes of each slide; this document adds the timing, the numbers to remember, the line that moves you to the next slide, and the question each slide invites.

**Total target: about 7 minutes**, plus 2 to 3 minutes of questions. If you have 10 to 12 minutes, add the "if you have more time" lines.

| Slide | Seconds | Slide | Seconds |
|---|---|---|---|
| 1 Title | 20 | 9 Framework | 30 |
| 2 Agenda | 15 | 10 Experiment design | 45 |
| 3 Background | 40 | 11 Rupee Error Rate | 60 |
| 4 Problem statement | 40 | 12 Expected results | 35 |
| 5 Literature survey | 60 | 13 Novelty and IP | 30 |
| 6 Research gap | 40 | 14 Work plan and budget | 25 |
| 7 Question and objectives | 40 | 15 References | 10 |
| 8 How voice entry works | 45 | 16 Thank you | 10 |

**Three things to say slowly, because the marks are there:** the gap (slide 6), the Rupee Error Rate rule (slide 11), and what would prove you wrong (slide 12).

---

## Slide 1: Title

**Goal:** land the topic in one sentence, then move on. Do not read the title aloud word for word.

- "Our topic is offline voice-based khata entry for kirana stores."
- "In one line: can a cheap Android phone let a shopkeeper record a credit entry just by speaking, with no internet, and still get the money right?"
- "We build on SmartOps, the offline-first shop app we already made, so the feature has somewhere real to live."
- Introduce the team in four words, not four sentences.

**Transition:** "Here's how I'll go through it."

**Invites:** "What is SmartOps?" Answer in one line: an offline-first app for kirana shops that handles sales, stock and khata, with a local database on the phone that syncs when there is internet.

---

## Slide 2: Agenda

**Goal:** 15 seconds. Show the shape of the talk so the panel can follow.

- "First the problem, then what others have done and the gap."
- "Then our question, objectives and method."
- "The main new idea, the Rupee Error Rate, gets its own slide."
- "Then expected results, novelty, plan and references."

**Transition:** "Starting with why this matters."

---

## Slide 3: Background

**Goal:** establish that the problem is real and worth money, in three beats.

- "Kirana shops give goods on credit and write it in a paper khata."
- "Digital tools do help: in a study of 403 Indian unorganised retailers, adopting digital payment tools raised revenue by 9.6% on average."
- "But typing an entry while a queue waits is slow, and harder for anyone not comfortable with a phone keyboard."
- "Research in India has shown low-literacy users prefer voice to text, and Whisper now handles Hindi and Marathi. So voice looks like the obvious answer."

**Numbers:** 403 retailers, 9.6%.

**Transition:** "So why hasn't it been done? Three reasons."

**Invites:** "Don't apps like Khatabook already exist?" Answer: yes, and shopkeepers still keep the paper book, because typing at the counter is the slow part. We are not building another khata app; we are testing whether voice can replace typing offline.

---

## Slide 4: Problem statement

**Goal:** name the three obstacles, then read the problem statement once, slowly.

- Read the boxed statement aloud once. It is the sentence the examiner will write down.
- "First, no internet. The good speech systems run in the cloud and shops lose signal."
- "Second, mixed languages. Someone will say 'Ramesh ka 250 ka udhaar add karo' in one breath, mixing Hindi and English."
- "Third, and this is the one people miss, money has to be exact. If 'dhai sau' is heard as 'do sau', the customer's account is 50 rupees off."
- "Word error rate, the usual measure, counts that the same as a wrong 'ka' or 'ko'."

**Numbers:** dhai sau = 250, do sau = 200, ₹50 wrong.

**Transition:** "So what has already been done about this?"

**Invites:** "Why not just ask them to type slower or train them?" Answer: the constraint is the queue, not the skill. Anything that adds seconds at the counter does not get used.

---

## Slide 5: Literature survey

**Goal:** show you read the field and can see the pattern. Walk the table top to bottom, one line each, then land the last column.

- "These are six of the sixteen papers in our report, in time order."
- "2007, Medhi: text-free voice interfaces were strongly preferred by low-literacy users, but that was recorded voice, not recognition."
- "2020, SLURP: judge a spoken command by the details it extracts, not by words. English, and no money."
- "2023, Whisper: 680,000 hours of training, works across languages without task-specific training, but general speech and large models."
- "2023, IndicWhisper: best on 39 of 59 Indian benchmarks, but accuracy swings by domain, and none of the domains is a shop."
- "2025, Biswas: adapting Whisper to Hindi–English mixing, still no Marathi and not offline."
- "2026, Söhler: 8-bit Whisper-small is 57% smaller with no accuracy loss, but that was English, on servers."
- Then point at the last column: "Look at this column. Every paper leaves something open."

**Numbers:** 16 papers total, 6 shown; 680,000 h; 39 of 59; 57% smaller.

**Transition:** "Put those gaps together and you get a clear picture."

**Invites:** "Why these six?" Answer: one per period, chosen to show the chain. The full sixteen, with a comparison table sorted by year, is Section 2.1 of the report.

---

## Slide 6: Research gap

**Goal:** the most important slide for marks. Say the chain, then the three missing pieces.

- "Read the literature in order and each period fixes what the last one couldn't."
- "2003 to 2010: voice suits these users, and word error rate is already known to be imperfect."
- "2019 to 2021: mixed Indian speech is hard, and you should judge a command by the details it extracts."
- "2022 to 2024: the big multilingual and Indian models arrive."
- "2025 to 2026: Whisper gets shrunk and tuned for Indian speech."
- "What is still missing is three things: nobody has tested short mixed Hindi–Marathi–English khata commands; nobody has tested this offline on a cheap phone; and nobody measures the error in money."

**Transition:** "That gives us one question."

**Invites:** "Are you sure nobody has done this?" Answer: our claim is narrow and specific, which is the safe way to claim a gap. We searched IEEE, ACL Anthology, ISCA Archive and Google Scholar, and every reference was checked on its publisher page.

---

## Slide 7: Research question and objectives

**Goal:** read the question once, then four objectives in four short lines.

- Read the boxed question aloud.
- "Objective one: record about 360 khata commands from 12 speakers, where we already know the right answer because we wrote the cards."
- "Two: build the offline feature in SmartOps and compare it with a cloud service, with and without the customer-name hint."
- "Three: measure errors in rupees, and check how well word error rate predicts them."
- "Four: a small test where 10 people try voice against typing."

**Numbers:** 360 clips, 12 speakers, 10 people, 4 objectives.

**Transition:** "So here's how the feature actually works."

**Invites:** "Why one question with four objectives?" Answer: the objectives are the steps that answer it, and each maps to one hypothesis and one test. Table 1 of the report shows that mapping.

---

## Slide 8: Proposed methodology, how voice entry works

**Goal:** walk the six steps in the diagram. Use the example sentence.

- "The shopkeeper presses a button and speaks."
- "Whisper turns it into text on the phone itself, with no internet."
- "Simple rules pick out the amount and the type. 'Paanch sau' becomes 500, and 'udhaar' means credit."
- "We match the name against the shop's own customer list, which is already on the phone."
- "The shopkeeper sees a confirm screen and taps Save, so nothing goes into the khata blindly."
- Then read the example at the bottom: "Sunanda tai ne saade teen hazaar jama kele' becomes Sunanda Patil, 3,500 rupees, repayment."

**Transition:** "That customer list is also used as a hint, and that's one of the things we test."

**Invites:** "Why rules and not an AI model for extraction?" Answer: rules run offline, are fast and are easy to check. A cloud language model would break the offline requirement.

---

## Slide 9: Conceptual framework

**Goal:** 30 seconds. Say what we change and what we measure, and point at the arrows.

- "On the left is what we change: the speech setup, which is cloud, offline Whisper, or offline Whisper with the name hint."
- "In the usability test, what we change is voice against typing."
- "On the right is what we measure: whether the whole entry is right, the Rupee Error Rate, and time on the phone. For users, time per entry and the SUS score."
- "The arrows are our four hypotheses."
- "Language and noise may change the results, so we record them for every clip."

**Invites:** "What are your independent and dependent variables?" This slide is the answer, so point at it rather than reciting.

---

## Slide 10: Experiment design

**Goal:** the three parts, then the sample-size defence. Expect a question here.

- "Part A, the test set: 12 speakers, 30 commands each, about 360 clips. Four of them are shopkeepers."
- "Twenty commands are read from cards and ten are said in the speaker's own words from a picture card, so we get natural phrasing too."
- "Part B: every clip goes through all three setups, so any difference comes from the setup, not from the speech."
- "Part C: 10 people do five entries by voice and five by typing, half starting with each, and we time them."
- "On size: because it is paired, 360 clips gives 80% power to catch a five to six point accuracy gap, and 10 people is enough for a large speed difference."

**Numbers:** 12 × 30 = 360; 20 read + 10 free; 3 setups; 10 people; 5 + 5 entries; 80% power.

**Transition:** "Now the part we think is new."

**Invites:** "Is 360 clips enough?" Answer: small for training a model, fine for testing one, especially because every clip is used in every setup, which is what makes the comparison paired.

---

## Slide 11: Our key idea, the Rupee Error Rate

**Goal:** the highlight of the talk. Slow down. Use the chart.

- "Word error rate counts every wrong word the same. Watch what that hides."
- "The shopkeeper says 'Ramesh ko 250 udhaar'."
- "First output: 'Ramesh ka 250 udhaar'. One word wrong out of four, so 25% word error, and the money error is zero."
- "Second: 'Ramesh ko 200 udhaar'. Same 25% word error, but 50 rupees wrong."
- "Third: 'Suresh ko 250 udhaar'. Same 25% again, but now 500 rupees is in the wrong place, because it is missing from Ramesh and wrongly added to Suresh."
- "So we measure the Rupee Error Rate: how many rupees end up in the wrong place per 100 entries."
- "The rules are simple. Wrong amount is the difference. Wrong customer counts twice. Credit and repayment swapped is twice the amount, because the balance moves the wrong way."
- "And hypothesis three tests the claim directly: word error rate is only a weak guide to money error."

**Numbers:** 25% WER for all three; ₹0, ₹50, ₹500.

**Transition:** "So what do we expect to find?"

**Invites:** "Why does the wrong customer count twice?" Answer: two accounts are wrong. One person is missing the entry and another person wrongly has it, so the shop's books are off by the amount in two places.

---

## Slide 12: Expected results

**Goal:** make clear these are expectations, and that each one can be proved wrong.

- "These are hypotheses, not results. We haven't run the study yet."
- "H1: cloud should get more entries fully right than offline, but we hope by a small gap. McNemar test."
- "H2: the customer-name hint should improve name accuracy, because names are rare words a general model does not expect. McNemar again."
- "H3: word error rate should be a weak guide to money error. Spearman rank correlation."
- "H4: voice should be faster than typing. Wilcoxon signed-rank."
- "The last column is what would prove us wrong, which is how we keep ourselves honest."

**Transition:** "So what's new in all this?"

**Invites:** "Why McNemar and not chi-square?" Answer: the same clip goes through both setups, so the data is paired, and McNemar is the paired version. Chi-square assumes two separate groups.

---

## Slide 13: Novelty and IP potential

**Goal:** answer the question every panel asks: what is new?

- "Three things are new."
- "One, the Rupee Error Rate: scoring speech errors by the money they put in the wrong place. We found no paper that does this."
- "Two, the first test of offline, mixed Hindi–Marathi–English khata commands on a low-cost phone."
- "Three, using the shop's own customer list as a hint, and measuring how much it helps."
- "On IP: the measure and the hint may be protectable, so before publishing we will check with the institute's IP cell."

**Invites:** "Isn't the Rupee Error Rate just word error rate with extra steps?" Answer: no. Slide 11 shows three outputs with identical word error rates and money errors of 0, 50 and 500 rupees. H3 tests that difference directly.

---

## Slide 14: Work plan and budget

**Goal:** 25 seconds. Show it is doable this semester.

- "Twelve weeks. Recording is done by week 5, accuracy results by week 8, the usability test by week 9."
- "That leaves three weeks for analysis and writing."
- "The whole budget is about 11,000 rupees, and most of that is one cheap Android phone at 6,000."
- "Everything else is small: cloud usage, thank-you payments to shopkeepers, printing and travel. All the software is free."

**Numbers:** 12 weeks, ₹11,000, ₹6,000 phone, 5 milestones.

**Invites:** "What is the biggest risk?" Answer: recruiting shopkeepers, since their time is money. That is why only four of the twelve speakers are shopkeepers, and why the sessions are short.

---

## Slide 15: References

**Goal:** 10 seconds. Do not read them out.

- "These are the papers cited on the slides, numbered as in our report."
- "The report has 21 references in IEEE style, and each one was checked against its publisher page."

---

## Slide 16: Thank you

- "To sum up: offline voice entry for khata, judged by the rupees it gets wrong, not just the words."
- "It runs in 12 weeks on about 11,000 rupees, inside an app we already built."
- "Thank you. Happy to take questions."

---

# If you have more time (10 to 12 minutes)

Add these, in this order of value:

1. **Slide 5:** one extra sentence per paper about the method, for example that Whisper used weak supervision, meaning imperfect internet transcripts rather than hand-cleaned data.
2. **Slide 10:** describe one command card and how the correct answer is known in advance.
3. **Slide 11:** work through the five-entry example from the report: total money error ₹1,650 over 5 entries, so the Rupee Error Rate is ₹33,000 per 100 entries, while 40% of entries were fully right.
4. **Slide 12:** explain each test in one sentence, in plain words, the way they are written in the explainer.
5. **Slide 14:** name the ethics steps: consent forms in three languages, made-up customer names, clips stored under codes such as S07.

# Five questions to rehearse out loud

1. **"What is new in your research?"** The Rupee Error Rate, applied to offline mixed-language khata commands on a cheap phone.
2. **"Why not just use the cloud?"** We do, as the comparison. The app has to work without internet, so the question is how close offline gets.
3. **"Is your sample big enough?"** Paired design: 360 clips for 80% power on a five to six point gap, and 10 people each acting as their own control.
4. **"How will you validate it?"** Known correct answers for every clip, the same clips through every setup, and four hypotheses with named tests and stated ways to be proved wrong.
5. **"What are the limitations?"** One phone, one model, mostly student speakers, scripted commands and a test khata rather than a shop's real book. All of these are in the report.
