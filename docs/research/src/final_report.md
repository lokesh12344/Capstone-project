---
title: "Offline Voice-Based Khata Entry in Hindi, Marathi and English for Kirana Stores"
---

# Abstract

Kirana shopkeepers write most credit (khata) entries while serving a queue, and typing a name and an amount on a phone is slow at that moment. Speaking the entry, for example "Ramesh ko 500 udhaar", would be faster. However, most speech recognition runs in the cloud and needs internet, and shops often lose connectivity. Shopkeepers also mix Hindi, Marathi and English in the same sentence. This study tests whether a free speech model (Whisper) running fully offline on a low-cost Android phone can capture the three details a khata entry needs: the customer's name, the amount, and whether it is credit or a repayment. We will record about 360 short commands from 12 speakers and compare a cloud speech service with an 8-bit offline Whisper model, with and without the shop's customer-name list as a hint. We judge accuracy by whether the whole entry is right and introduce a new measure, the Rupee Error Rate, which counts how many rupees end up in the wrong place per 100 entries. Word error rate treats a wrong filler word and a wrong amount the same, so we also test how well it predicts money errors. A small test with 10 people will compare voice entry with typing on time and a standard usability score. The study uses our own offline-first app, SmartOps, and its expected output is a working offline voice-entry feature with measured accuracy in rupees.

**Keywords:** speech recognition, offline, Whisper, code-mixing, Hindi, Marathi, khata, kirana, Rupee Error Rate, usability

# 1. Introduction

## 1.1 Title of the Research

**Offline Voice-Based Khata Entry in Hindi, Marathi and English for Kirana Stores**

The title states what we test (entering khata by voice), the condition that matters most (offline, on the phone), the languages involved (Hindi, Marathi, English and mixes of them) and the users (kirana shopkeepers).

## 1.2 Background of the Study

In a kirana shop, regular customers often take goods on credit and pay later. The shopkeeper notes each of these in a khata book. Digital tools help such shops: a study of 403 Indian unorganised retailers found that adopting digital payment tools raised revenue by 9.6% on average [@K2], and low-cost technology is seen as a way for kiranas to stay competitive [@K1]. Several khata apps exist, yet many shopkeepers still keep the paper book as well.

One reason is the effort of typing. A credit entry means finding the customer, typing the amount and choosing credit or repayment while other customers wait. Typing is also harder for people who are not comfortable reading and writing on a phone. Earlier work in India found that low-literacy users strongly preferred interfaces built on voice and pictures [@V11], and that farmers preferred speaking to typing when using a phone service [@V12].

Speech recognition has improved a lot in the last few years. Whisper was trained on 680,000 hours of audio and works on many languages without extra training [@V1], and Indian research groups have released large speech datasets and models for Indian languages [@V2], [@V5]. For a kirana app, though, three problems remain.

1. **No internet.** The strongest speech systems run in the cloud, and shops lose mobile connectivity often [@K3].
2. **Mixed languages.** A shopkeeper may say "Ramesh ka 250 ka udhaar add karo", mixing Hindi and English in one sentence. Speech systems still find such mixed speech hard [@V4], [@V16].
3. **Money is what matters.** For a khata entry, the exact words matter less than three details: name, amount and type. If "dhai sau" (250) is heard as "do sau" (200), the customer's account is off by ₹50. The usual measure, word error rate, counts this the same as a wrong filler word.

SmartOps is the offline-first sales, stock and khata app we built for kirana shops. It already keeps the shop's customer list on the phone, so a voice feature can use that list to help recognise names. This makes it a practical test bed for the three problems above.

## 1.3 Significance of the Study

**Academic value.** Speech research on Indian languages reports word error rate on general speech. We measure errors on short, mixed-language khata commands and express them in rupees, which no earlier study has done.

**Technical value.** We show whether an 8-bit Whisper model is usable offline on a cheap phone for this task, and we test two simple additions: a customer-name hint and rules for Indian number words.

**Practical value.** If voice entry works offline, shopkeepers can record credit faster, including those who find typing hard. The Rupee Error Rate also tells a developer, in terms a shopkeeper understands, how much money a mistake could cost.

**Beneficiaries.** Kirana owners and staff; developers of apps for small shops; and students working on Indian-language speech apps.

**Contribution to knowledge.** A small, controlled comparison of cloud and offline speech recognition for khata entries, a money-based error measure, and evidence on whether voice entry is faster than typing for real users.

**SDG alignment.** The study supports **SDG 8.3** (growth of micro and small enterprises), **SDG 9.c** (access to information and communication technology) and **SDG 10.2** (inclusion of all people, including those less comfortable with reading and typing).

## 1.4 Aim, Objectives, Research Questions and Hypotheses

**Aim.** To find out whether an offline speech model on a low-cost Android phone can record khata entries spoken in Hindi, Marathi, English or a mix accurately enough, judged by the money it gets wrong, and quickly enough to be used instead of typing.

**Main research question.** *Can an offline speech model on a low-cost Android phone record mixed-language khata entries with few rupee errors and faster than typing?*

**Objectives.**

- **O1.** To record a test set of about 360 short khata commands from 12 speakers, where the correct name, amount and type of every command are known in advance.
- **O2.** To build an offline voice-entry feature in SmartOps and compare it with a cloud speech service, with and without the customer-name hint, on how often the amount, the name and the whole entry are right, and on time taken on the phone.
- **O3.** To measure recognition errors in money terms using a Rupee Error Rate, and to check how well word error rate predicts these money errors.
- **O4.** To compare voice entry with typing in a test with 10 people, on time per entry and System Usability Scale (SUS) score.

**Research questions.**

- **RQ1** (O2). How often does the offline model get the whole entry right, compared with the cloud service?
- **RQ2** (O2). Does the customer-name hint improve name accuracy?
- **RQ3** (O3). How well does word error rate predict the money error of an entry?
- **RQ4** (O4). Is voice entry faster than typing, and how do users rate it?

**Hypotheses.**

- **H1.** The cloud service gets more whole entries right than the offline model. (*Null: both get the same share of entries right.*)
- **H2.** The customer-name hint increases the share of names the offline model gets right. (*Null: the hint makes no difference.*)
- **H3.** Word error rate is only a weak predictor of money error: the rank correlation between them across clips is below 0.5. (*Null: the correlation is 0.5 or higher, meaning word error rate is a good enough guide.*)
- **H4.** Users take less time per entry by voice than by typing. (*Null: there is no difference in time.*)

Table {@tab:map} shows how each objective, research question, hypothesis and test fit together.

Table: {#tab:map} Objectives, research questions, hypotheses and tests

| Objective | Research question | Hypothesis | Test |
|---|---|---|---|
| O1: build the test set | (supports all) | (supports all) | Descriptive counts |
| O2: cloud vs offline, name hint | RQ1, RQ2 | H1, H2 | McNemar test |
| O3: Rupee Error Rate | RQ3 | H3 | Spearman rank correlation |
| O4: voice vs typing | RQ4 | H4 | Wilcoxon signed-rank test |

# 2. Literature and Research Foundation

## 2.1 Literature Review

We arrange the literature in time order. Each period solved something the earlier one could not, and each still left a gap that our study picks up.

### Period 1: Word errors and voice for low-literacy users (2003–2010)

**Wang, Acero and Chelba (2003)** asked whether a lower word error rate always leads to better understanding of what the user meant. Working on a spoken language system, they found that it does not: tuning the recogniser for the understanding task mattered more than lowering word error rate [@V17]. This is the earliest warning we use that counting wrong words is not the same as measuring useful accuracy. Their work did not look at numbers or money.

**Morris, Maier and Green (2004)** pointed out weaknesses in word error rate as a measure. For example, it is not bounded between 0 and 1, and it treats errors in a way that is hard to interpret. They proposed two alternatives, match error rate (MER) and word information lost (WIL) [@V10]. These are better behaved, but they still give every word the same weight, so a wrong amount and a wrong filler word still count the same.

**Medhi, Sagar and Toyama (2007)** designed text-free interfaces with domestic workers in Bangalore slums who could not read. Using voice and pictures instead of text, they built a job-search application and a map, and found these were strongly preferred over text interfaces [@V11]. The study showed that voice suits low-literacy users, but it used recorded voice, not speech recognition.

**Patel et al. (2010)** ran Avaaj Otalo, a phone-based voice forum for 51 small farmers in Gujarat, for seven months. Farmers asked and answered questions by voice, and preferred voice to text [@V12]. Like the previous study, it relied on recorded messages and keypad menus. Neither study tested whether software could understand the speech correctly.

### Period 2: Mixed languages and judging by the details (2019–2021)

**Sitaram et al. (2019)** surveyed research on code-switching, where speakers change language within a sentence. They found that it makes both speech recognition and language understanding harder, and that suitable datasets are scarce [@V6]. The survey explains why Hindi–English mixing is difficult, but it does not cover Marathi mixing or shop commands.

**Bastianelli et al. (2020)** released SLURP, a dataset of spoken English commands to a home assistant across 18 domains. They showed that mistakes in the transcript carry through into mistakes in the extracted details, such as a date or a device name, and proposed a metric that scores those details directly [@V9]. This supports judging an entry by its name and amount. SLURP is in English and has no money values.

**Diwan et al. (2021)** organised the MUCS 2021 challenge, with about 600 hours of speech in seven Indian languages, including Marathi, and Hindi–English and Bengali–English code-switched sets [@V4]. The challenge showed that mixed and low-resource Indian speech is still hard to recognise. It measured only word-level errors.

**Gordeeva et al. (2021)** argued that each application needs its own idea of what a serious error is, because an improvement in one domain can make another worse. They proposed a framework for "meaning error rates" tied to the task [@V18]. This is the closest idea to ours, but it gives no money-based version for financial entries.

### Period 3: Large multilingual and Indian-language models (2022–2024)

**Javed et al. (2022)** collected 17,000 hours of raw speech in 40 Indian languages and trained IndicWav2Vec models on it. They showed that training on many Indian languages together is an effective way to build Indian speech recognition [@V3]. The models still need fine-tuning for each language and are too large for a cheap phone without changes.

**Radford et al. (2023)** trained Whisper on 680,000 hours of audio from the internet in many languages. It worked on many test sets without task-specific training, often close to models trained for each task [@V1]. This is why a student project can use Whisper directly, but the paper reports results on general speech, mostly on large models.

**Bhogale et al. (2023)** built Vistaar, 59 test sets across Indian languages and domains, and trained IndicWhisper on 10,700 hours of Indian speech. IndicWhisper had the lowest error on 39 of the 59 test sets, but error rates varied widely between domains [@V2]. None of the domains is shop or khata speech.

**Gandhi et al. (2023)** made Distil-Whisper, a smaller version of Whisper that is 5.8 times faster with 51% fewer parameters, while staying within 1% of Whisper's word error rate on English [@V7]. This suggests that a compressed model can keep most of its accuracy, but it was tested only on English.

**Javed et al. (2024)** created IndicVoices, 7,348 hours of mostly natural speech from 16,237 speakers in 145 districts and 22 languages [@V5]. It is the largest Indian speech collection so far. It contains everyday conversation but not short commands with names and amounts.

### Period 4: Adapting Whisper to Indian speech and small devices (2025–2026)

**Tripathi, Gothi and Wasnik (2025)** improved Whisper for Indian languages in two ways: prompt-tuning using language-family information, and a new tokenizer that produces fewer tokens and so runs faster. The methods improved both accuracy and speed across Whisper sizes [@V19]. The results are reported as word error rate on general Indian-language speech.

**Biswas et al. (2025)** adapted Whisper to Hindi–English code-mixed speech with little data. They used language prompts during fine-tuning, simulated code-mixed audio on the fly, and generated extra mixed-language text with a large language model [@V16]. Their results on a Hindi–English dataset were promising, but the work does not cover Marathi, offline phones or money.

**Söhler, Irigoyen and Kirkedal (2026)** compared ways of compressing Whisper-small with post-training quantisation. Dynamic 8-bit quantisation reduced model size by 57% while slightly improving word error rate, while more aggressive compression hurt accuracy on noisy audio [@V20]. The tests used English LibriSpeech audio on server processors and GPUs, not phones or Indian speech.

Table {@tab:lit} summarises these studies in time order.

Table: {#tab:lit} Summary of literature in chronological order

| Year | Authors [ref] | Focus | Method | Dataset / hardware | Key finding | Gap for us |
|---|---|---|---|---|---|---|
| 2003 | Wang et al. [@V17] | WER vs understanding | Experiments on a spoken language system | Spoken language system tasks | Lower WER does not always mean better understanding | No numbers or money |
| 2004 | Morris et al. [@V10] | Better error measures | Analysis, new metrics | Speech recognition output | Proposed MER and WIL | All words weighted equally |
| 2007 | Medhi et al. [@V11] | Text-free UI | Ethnographic design | Low-literacy users, Bangalore | Voice and pictures preferred | No speech recognition |
| 2010 | Patel et al. [@V12] | Voice forum for farmers | 7-month field study | 51 farmers, Gujarat, phone line | Voice preferred to text | Recorded voice, not recognition |
| 2019 | Sitaram et al. [@V6] | Code-switched speech | Survey | Published datasets | Mixing harms ASR; data scarce | No Marathi mixing or commands |
| 2020 | Bastianelli et al. [@V9] | Spoken commands | New dataset and metric | SLURP, English, 18 domains | Word errors carry into detail errors | English, no money |
| 2021 | Diwan et al. [@V4] | Indian and mixed ASR | Shared challenge | About 600 h, 7 languages | Mixed Indian speech still hard | Word-level errors only |
| 2021 | Gordeeva et al. [@V18] | Task-based error rate | Metric framework | ASR in several domains | Each task needs its own error measure | No money-based measure |
| 2022 | Javed et al. [@V3] | Indian ASR pretraining | Self-supervised training | 17,000 h, 40 languages | Multilingual pretraining works | Large models, no phone tests |
| 2023 | Radford et al. [@V1] | Whisper | Weakly supervised training | 680,000 h, many languages | Works without task-specific training | General speech, big models |
| 2023 | Bhogale et al. [@V2] | Indian ASR benchmarks | Benchmarking, fine-tuning | 59 test sets; 10,700 h | IndicWhisper best on 39 of 59 | No shop or khata speech |
| 2023 | Gandhi et al. [@V7] | Smaller Whisper | Distillation | English test sets | 5.8× faster, near-equal WER | English only |
| 2024 | Javed et al. [@V5] | Indian speech data | Corpus building | 7,348 h, 22 languages | Largest Indian speech set | No short money commands |
| 2025 | Tripathi et al. [@V19] | Whisper for Indian languages | Prompt-tuning, new tokenizer | Indian-language test sets | Better accuracy and speed | WER only, general speech |
| 2025 | Biswas et al. [@V16] | Hindi–English mixed speech | Fine-tuning with synthetic data | Hindi–English dataset | Promising gains with little data | No Marathi, not offline |
| 2026 | Söhler et al. [@V20] | Quantising Whisper-small | Comparing 8-bit and lower | English LibriSpeech; servers | 8-bit cuts size 57% at no loss | English, not on phones |

Read from top to bottom, the table shows a clear path. Early work showed that voice suits low-literacy users and that word error rate is an imperfect measure. Later work made recognition of Indian and mixed speech possible, and the newest work shrinks Whisper and adapts it to Indian speech. What is still missing is a test of offline recognition on a cheap phone for mixed Hindi–Marathi–English khata commands, judged by the money it gets wrong.

## 2.2 Theories, Concepts and Existing Methodologies

**Speech recognition (ASR).** Software that turns speech into text. In our pipeline it is only the first step, and the text still has to become a khata entry.

**Extracting the details.** Simple rules pick out the amount from digits or number words ("paanch sau" is 500, "saade teen hazaar" is 3,500), the type from keywords ("udhaar" or "baaki" for credit, "jama" or "diye" for repayment), and the name as the closest match in the shop's customer list. This follows the idea from SLURP that the extracted details are what count [@V9].

**Model compression (quantisation).** The model's numbers are stored with less precision, for example 8 bits instead of 32, so the model is smaller and faster. Recent work shows 8-bit Whisper-small keeps its accuracy on English [@V20]. We test whether this holds for our task.

**Name hint.** Whisper can be given a short text before it starts listening, and it tends to use words from that text. We pass the shop's customer names in this way, so that uncommon names are more likely to be recognised.

**Word error rate and its limits.** Word error rate is the share of words that are wrong. Earlier studies showed it does not always match how useful the output is [@V17], [@V18], and it gives every word the same weight [@V10].

**Rupee Error Rate (our measure).** For a khata entry, the question that matters is how much money ends up in the wrong place. We define the money error of one entry by comparing the balance change that should have happened with the one that was recorded:

- if the right customer is chosen, the money error is the difference between the true and recorded balance change;
- if the wrong customer is chosen, the full amount is missing from the right customer and wrongly added to the other, so both count.

A credit adds to the balance and a repayment subtracts from it. So swapping credit and repayment gives an error of twice the amount. The **Rupee Error Rate (RER)** is the total money error divided by the number of entries, times 100. It reads as *rupees wrongly recorded per 100 entries*. Figure {@fig:rupee} shows why this differs from word error rate: three outputs with the same word error rate can have very different money errors.

![Same word error rate, different money error: for the spoken entry "Ramesh ko 250 udhaar", three outputs each have one wrong word out of four (25% WER), but the money error is ₹0, ₹50 and ₹500](figures/p2_rupee.png){#fig:rupee}

**Usability.** The System Usability Scale (SUS) is a 10-question form that gives a score from 0 to 100 [@V13]. It is short enough to use with shopkeepers.

**Existing methods.** Speech research measures accuracy on recorded test sets [@V1], [@V2]. HCI studies in India used field deployments and interviews [@V11], [@V12], and usability studies often combine a timed task with the SUS form [@V13]. We use a small version of each: a recorded test set, a timed task and the SUS form, plus a few interview questions. Table {@tab:vars} lists the variables.

Table: {#tab:vars} Variables in this study

| Variable | Type | How we measure it |
|---|---|---|
| Speech setup | Independent | Cloud service; offline Whisper; offline Whisper with name hint |
| Input mode (usability test) | Independent | Voice or typing |
| Language of command | Background | Hindi, Marathi, English or mixed (noted per clip) |
| Recording place | Background | Quiet room or inside a shop |
| Amount correct (%) | Dependent | Extracted amount equals the true amount |
| Name correct (%) | Dependent | Right customer chosen |
| Whole entry correct (%) | Dependent (main) | Name, amount and type all right |
| Rupee Error Rate (₹ per 100 entries) | Dependent | Money error summed and scaled, as defined above |
| Time on phone (s) | Dependent | End of speech to result on screen |
| Word error rate (%) | Supporting | Share of words wrong in the transcript |
| Time per entry (s), SUS score | Dependent (usability) | Timer in the app; SUS form |

## 2.3 Research Gap

The literature in Table {@tab:lit} leaves four gaps:

1. **No test on khata-style commands.** Indian speech research covers news, lectures and conversation [@V2], [@V5], not short shop commands mixing names, amounts, Hindi, Marathi and English.
2. **No money-based error measure.** Earlier work showed that word error rate is not the whole story [@V17], [@V18], but no one has weighted recognition errors by their money value.
3. **Offline performance on cheap phones is unknown.** Compressed Whisper models have been tested on English and on servers [@V7], [@V20], not on low-cost Android phones with Indian speech.
4. **Voice versus typing with real recognition.** Earlier Indian studies found users prefer voice, but they used recorded messages, not software that can mishear [@V11], [@V12].

Our study addresses these gaps. We build a small test set of khata commands, run it through cloud and offline setups on a cheap phone, score the results in rupees as well as words, and compare voice with typing with real users.

## 2.4 Research Framework / Conceptual Framework

Figure {@fig:framework} shows our conceptual framework. The speech setup and the input mode are the independent variables. The speech setup affects accuracy (amount, name, whole entry), the Rupee Error Rate and the time on the phone. In the usability test, the input mode affects time per entry and the SUS score. The language of the command and background noise may change how well each setup works, so we record them for every clip.

![Conceptual framework: speech setup affects accuracy, Rupee Error Rate and time on phone; input mode affects time per entry and usability score; language and noise may change the results](figures/p2_framework.png){#fig:framework}

Each link in the framework is supported by earlier work. The link from speech setup to accuracy comes from the Whisper and IndicWhisper results [@V1], [@V2] and from the known difficulty of mixed speech [@V4], [@V16]. The link from compression to speed and size comes from studies of smaller Whisper models [@V7], [@V20]. The Rupee Error Rate builds on the finding that word errors do not always match task errors [@V17], [@V18]. The link from input mode to time and rating comes from the voice studies in India [@V11], [@V12].

# 3. Research Problem and Design

## 3.1 Research Problem

Typing khata entries at a busy counter is slow, and it is harder for shopkeepers who are not comfortable typing. Voice entry could help, but it must work without internet, understand mixed Hindi, Marathi and English, and get names and amounts exactly right. We do not know whether an offline model on a cheap phone can do this, how it compares with a cloud service, or how much money its mistakes would put in the wrong place. We also do not know whether shopkeepers would actually be faster with it.

**Problem statement.** *It is not known how accurately an offline speech model on a low-cost Android phone can capture the name, amount and type of khata entries spoken in Hindi, Marathi, English or a mix, how its errors translate into rupees compared with a cloud service, or whether voice entry is faster than typing for shop users.*

## 3.2 Research Approach

We use a **mainly quantitative** approach. Accuracy, rupee errors and time are all numbers, and each hypothesis compares numbers. We add a few short interview questions at the end of the usability test, because numbers alone will not tell us why someone preferred typing. We will report these answers as a short summary with a few quotes and will not run a separate qualitative analysis.

## 3.3 Research Design

The study has three parts, summarised in Table {@tab:design}.

- **Part A: Recording the test set.** Twelve speakers each record 30 short commands on the test phone. Twenty are read from printed cards, for example "Ramesh ko paanch sau udhaar". For the other ten, the speaker sees a picture card with a name, an amount and an arrow for "took on credit" or "paid back", and says it in their own words. Because we wrote every card, we already know the correct name, amount and type of each clip. All names are made up.
- **Part B: Accuracy experiment.** Every clip goes through all three setups: the cloud service, offline Whisper, and offline Whisper with the name hint. The same rules then pick out the details. Since every clip is used in every setup, differences between setups cannot come from differences in the speech.
- **Part C: Usability test.** Ten people, including four shopkeepers, each enter five khata entries by voice and five by typing in SmartOps. Half start with voice and half with typing, so neither method always gains from practice. We time each entry, ask for a SUS form after each method, and ask three short questions.

This is an **experimental design** with a small **development** part (the voice feature itself). We chose it because it gives clear comparisons on the same clips and the same people, and because it fits within one semester.

Table: {#tab:design} Summary of the experimental design

| Part | Who or what | Size | What is compared |
|---|---|---|---|
| A. Test set | 12 speakers: 4 of us, 4 friends, 4 shopkeepers | About 360 clips (12 × 30) | Nothing; recording only |
| B. Accuracy | All clips | 360 clips × 3 setups | Cloud vs offline; name hint on vs off |
| C. Usability | 10 people, including 4 shopkeepers | 5 voice + 5 typed entries each | Voice vs typing |

## 3.4 Scope of the Research

- **Research area.** Speech recognition for Indian-language apps, and app usability for small shops.
- **Population.** Speakers of Hindi, Marathi and English in Maharashtra, and kirana shopkeepers and staff who use Android phones.
- **Variables.** As listed in Table {@tab:vars}.
- **Conditions.** Short commands of 2 to 8 seconds; recordings in quiet rooms and inside shops; one low-cost Android phone with 2 to 3 GB of RAM.
- **Applications.** Voice entry in SmartOps and in similar khata or billing apps.
- **Exclusions.** We do not train a new speech model, support other Indian languages, build an always-listening assistant, identify speakers by voice, or make any credit decisions.

# 4. Research Implementation and Evaluation

## 4.1 Data Collection

**Primary data.**

1. **Voice clips.** About 360 clips (12 speakers × 30 commands), recorded in the test app at 16 kHz. For each clip we store the correct name, amount and type, the language used, and whether it was recorded in a quiet place or a shop.
2. **Experiment results.** For each clip and setup: the text produced, the extracted name, amount and type, the money error in rupees, and the time taken on the phone.
3. **Usability data.** For each participant: time per entry for voice and for typing, any wrong entries, two SUS scores, and short notes of their answers.

**Secondary data.** SmartOps demo data gives us realistic customer names and amounts for the cards.

**Sample size.**

- *Clips (H1, H2).* The McNemar test uses only the clips on which two setups disagree. Suppose the setups disagree on about 10–12% of clips. A standard power calculation for McNemar's test then shows that 360 clips give 80% power, at the 5% level, to detect a gap of about 5 to 6 percentage points in accuracy. A gap smaller than that would matter little in practice.
- *Correlation (H3).* With 360 clips, a Spearman correlation around 0.3 would have a 95% confidence interval of roughly ±0.1. This is narrow enough to tell whether the correlation is below 0.5.
- *Usability test (H4).* Each person uses both methods, so we compare each person with themselves. With 10 people, a paired test has about 80% power to detect a large difference in time (an effect size of about 1). An example is voice saving around 10 seconds per entry when people's times vary by about 10 seconds. Twelve speakers is also within the 10 to 15 we can realistically recruit and record in about two weeks.

## 4.2 Tools and Techniques

Table {@tab:tools} lists the tools. The shopkeeper never has to trust the model blindly: after speaking, they see a confirm screen with the name, amount and type, and can correct it before it is saved. Figure {@fig:pipeline} shows the steps.

Table: {#tab:tools} Tools and techniques

| Category | Tool | Why we use it |
|---|---|---|
| Offline speech model | Whisper "small", 8-bit, run with whisper.cpp on Android | Free, supports Hindi and Marathi, fits on a cheap phone |
| Cloud speech service | Google Cloud Speech-to-Text (Hindi and Marathi) | A strong baseline to compare against |
| Detail extraction | Our own rules: number words to digits, keyword lists, closest-name matching | Simple, explainable, works offline |
| App | SmartOps with a "speak entry" button and a confirm screen | Real app for the usability test |
| Phone | Low-cost Android phone (2 to 3 GB RAM) | The kind of phone shopkeepers use |
| Forms | SUS [@V13], translated into Hindi and Marathi | Standard usability score |
| Analysis | Python with pandas, matplotlib, SciPy and jiwer | Percentages, charts, statistical tests, word error rate |

![Voice entry steps: the shopkeeper speaks, the phone turns speech into text offline, simple rules pick out the amount and type, the name is matched against the local customer list, and the shopkeeper confirms before the entry is saved](figures/p2_pipeline.png){#fig:pipeline}

## 4.3 Data Analysis and Performance Measures

**Measures.**

- **Amount correct (%)**: share of clips where the extracted amount equals the true amount exactly.
- **Name correct (%)**: share of clips where the right customer is chosen.
- **Whole entry correct (%)**: share of clips where name, amount and type are all right. This is our main accuracy measure.
- **Rupee Error Rate (₹ per 100 entries)**: total money error ÷ number of entries × 100, using the rules in Section 2.2. We measure it on the model's output before the confirm screen, so it shows the risk if the shopkeeper does not check carefully.
- **Time on phone (s)**: time from the end of speech to the result on screen, for the offline setups.
- **Word error rate (%)**: share of words wrong in the transcript, used for H3 and as a supporting number.
- **Usability**: median time per entry for voice and for typing, and the mean SUS score for each.

**Worked example of the Rupee Error Rate.** Table {@tab:rer} shows five entries as one setup might output them. The total money error is ₹0 + ₹50 + ₹1,000 + ₹600 + ₹0 = ₹1,650 over 5 entries, so RER = 1,650 ÷ 5 × 100 = ₹33,000 per 100 entries. Two of the five entries (40%) are fully right. Entries 2, 3 and 4 each have just one wrong word, yet their money errors range from ₹50 to ₹1,000.

Table: {#tab:rer} Worked example of the Rupee Error Rate (illustrative values, not results)

| Spoken entry | Model recorded | What went wrong | Money error (₹) |
|---|---|---|---|
| Ramesh, 500, credit | Ramesh, 500, credit | Nothing | 0 |
| Sunanda, 250, credit | Sunanda, 200, credit | Amount (dhai sau heard as do sau) | 50 |
| Iqbal, 500, repayment | Iqbal, 500, credit | Type swapped, balance moves the wrong way | 1,000 |
| Meena, 300, credit | Mehul, 300, credit | Wrong customer: missing from Meena, added to Mehul | 600 |
| Anil, 1,000, repayment | Anil, 1,000, repayment | Nothing | 0 |

**Descriptive analysis.** We will give tables of every measure for each setup, split by language (Hindi, Marathi, English, mixed) and by quiet or shop recording, with bar charts of accuracy and RER and a box plot of entry times.

**Statistical tests** (5% significance level).

- **H1 and H2: McNemar test.** Each clip is judged right or wrong under two setups, so the results come in pairs. The McNemar test looks only at the clips where the two setups disagree and checks whether one setup wins these clearly more often than half the time. For H1 we compare whole-entry correctness between cloud and offline. For H2 we compare name correctness between offline without and with the name hint.
- **H3: Spearman rank correlation.** For every clip we have a word error rate and a money error. We rank the clips by each and check how closely the two orders match. A value of 1 means word error rate predicts money error perfectly; a value near 0 means it does not predict it at all. H3 is supported if the whole 95% confidence interval of the correlation lies below 0.5. We will also compare the order of the three setups by word error rate with their order by RER.
- **H4: Wilcoxon signed-rank test.** Each person has one voice time and one typing time (their median over five entries). The test checks whether one method is consistently faster across people, without assuming the times follow a bell curve.

SUS scores and interview answers will be reported as descriptive results.

## 4.4 Expected Outcomes

These are expectations based on the literature, not results.

- The cloud service will probably get more entries fully right than the offline model. What matters is how big the gap is. A gap of a few percentage points would make offline use practical, especially with the confirm screen.
- Most errors will be in names and in number words like "dhai", "saade" and "paune". Mixed-language and in-shop clips will be harder than quiet, single-language ones.
- The name hint should clearly improve name accuracy, because customer names are uncommon words that a general model does not expect.
- The Rupee Error Rate will rank the setups differently from word error rate in at least some cases, since a setup that mishears filler words is harmless while one that mishears amounts is costly. We expect a weak correlation between word error rate and money error.
- On a cheap phone, the 8-bit model should respond within a few seconds for a short command. If it is too slow, we will report that and try the next smaller Whisper model.
- In the usability test we expect voice to be faster for most people, with some still preferring typing for privacy, since speaking a customer's debt aloud can be awkward.
- **Final output:** an offline voice-entry feature in SmartOps, a small labelled set of khata voice clips (shared only with speakers' consent), the Rupee Error Rate method, and a comparison table that other developers can use.

# 5. Research Management and Output

## 5.1 Limitations

- **Technical.** We test one offline model on one cheap phone, and other models or phones may behave differently. The rule-based extraction will miss unusual phrasings.
- **Data.** About 360 clips from 12 speakers is a small set, and most speakers are students, so results may not fully represent older shopkeepers.
- **Resource.** Shopkeepers are busy, so only a few of them can take part in recording and testing.
- **Time.** One semester allows one short session per person, so we cannot study whether people get faster with practice.
- **Financial.** The small budget limits incentives and the number of phones.
- **Methodological.** Read-out commands are cleaner than real shop speech, and the usability test uses scripted entries on a test phone, not a shop's real khata. The Rupee Error Rate depends on the amounts on our cards, so we report it together with the share of entries that are fully right.

## 5.2 Research Work Plan and Gantt Chart

The plan runs for 12 weeks from approval. Table {@tab:plan} lists the activities and Figure {@fig:gantt} shows them as a Gantt chart.

Table: {#tab:plan} Work plan, milestones and deliverables

| # | Activity | Weeks | Deliverable |
|---|---|---|---|
| 1 | Literature review | 1–2 | Review notes |
| 2 | Prepare command cards, consent forms and translations | 2–3 | Cards and forms |
| 3 | Get guide approval and record the clips | 3–5 | Voice clips with correct answers |
| 4 | Build the offline voice entry and extraction rules in SmartOps | 3–7 | Working feature |
| 5 | Run all clips through the three setups | 6–8 | Accuracy and rupee-error results |
| 6 | Usability test with 10 people | 8–9 | Times, SUS forms, notes |
| 7 | Analysis, charts and tests | 9–10 | Tables and charts |
| 8 | Report writing and review | 10–12 | Final report |

**Milestones:** M1 (week 3): cards and forms approved; M2 (week 5): all clips recorded; M3 (week 8): accuracy results ready; M4 (week 9): usability test done; M5 (week 12): final report submitted.

![Gantt chart of the 12-week work plan with milestones M1 to M5](figures/p2_gantt.png){#fig:gantt}

## 5.3 Cost Estimation / Budget

Table {@tab:budget} gives the estimated budget.

Table: {#tab:budget} Estimated budget

| Head | Item | Qty × rate | Amount (₹) |
|---|---|---|---|
| Equipment | Low-cost Android phone (2–3 GB RAM, refurbished) | 1 × 6,000 | 6,000 |
| Software | Whisper, whisper.cpp, Python libraries (all free) | – | 0 |
| Cloud | Cloud speech service for about 360 short clips | Lump sum | 500 |
| Data collection | Thank-you payment for shopkeepers (recording) | 4 × 200 | 800 |
| Data collection | Thank-you payment for shopkeepers (usability test) | 4 × 200 | 800 |
| Materials | Printing command cards, consent and SUS forms | Lump sum | 600 |
| Travel | Local travel to shops | Lump sum | 1,000 |
| Testing | Runs on our laptops and the test phone | – | 0 |
| Publication | Not planned; report printing and binding | Lump sum | 800 |
| Miscellaneous | Contingency | Lump sum | 500 |
| **Total** | | | **11,000** |

## 5.4 Expected Contribution, Ethical Considerations and References

**Expected contribution.**

- *Knowledge:* how well offline speech recognition handles mixed-language khata commands on a cheap phone compared with the cloud, and how its errors look in rupees.
- *Technical:* a working offline voice-entry feature, simple rules for Indian number words, and a customer-name hint.
- *Practical:* a faster way for shopkeepers to record credit, with a confirm step so mistakes are caught before they are saved.
- *Methodological:* the Rupee Error Rate, a simple way to score speech errors by their money impact, which other developers of finance and billing apps can reuse.
- *Innovation and IP:* the Rupee Error Rate and the customer-name hint for khata entry may have IP potential. Before any public release, we will discuss this with the institute's IP cell.

**Ethical considerations.**

- *Approval.* Our consent form, command cards and questions will be approved by our guide, and by the institute's ethics committee if the department requires it, before any recording starts.
- *Consent.* Every speaker and participant signs a consent form in Hindi, Marathi or English, read aloud if needed. Taking part is voluntary, and anyone can ask for their recordings to be deleted at any time. Speakers are told that clips for the cloud setup are sent to Google's servers, and can choose not to allow that.
- *Privacy.* All names and amounts in the commands are made up. Speakers are asked not to mention real customers, and the usability test uses a test khata, not the shop's real records. Voice is personal data, so each clip is stored under a code such as "S07", not the speaker's name.
- *Data security.* Recordings are kept in a password-protected folder that only our team can access. They are deleted after the project unless a speaker agrees to share them. We follow India's Digital Personal Data Protection Act, 2023 [@K4]: we tell people what we collect, ask for consent and collect only what we need.
- *Plagiarism.* All sources are cited in IEEE style, and the report will be checked with the institution's plagiarism software.

# References
