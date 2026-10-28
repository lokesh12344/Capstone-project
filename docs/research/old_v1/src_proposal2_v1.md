---
title: "Voice-First Khata: On-Device Speech-to-Ledger Entry for Code-Mixed Hindi–Marathi–English Credit Transactions in Kirana Stores"
short: Proposal 2
---

# Abstract

Kirana shopkeepers record customer credit (khata) at the busiest moments of the day, often with one hand on the counter and a queue waiting. Mobile bookkeeping apps ask them to type names and amounts on a small screen, in a script and language they may not use comfortably, so many shopkeepers keep the paper book. Speaking an entry ("Ramesh ko dhai sau udhaar") is quicker and needs no literacy. Current speech recognisers, however, run mostly in the cloud, struggle with code-mixed Indian speech, and have rarely been tested on the short, number-heavy utterances that bookkeeping involves. This study examines whether compressed speech-recognition models running entirely on a low-end Android phone can turn code-mixed Hindi, Marathi and English khata commands into correct ledger entries offline. The target is accuracy comparable to a cloud service, with shorter entry time than touch input. The study follows a mixed-methods design. The researchers will collect a new corpus of about 2,400 khata utterances from 40 speakers. On that corpus they will benchmark four recogniser configurations for word error, slot-level accuracy, latency and memory. A speech-to-ledger pipeline with number normalisation and customer-name biasing will then be built into the SmartOps app. Finally, a within-subjects field study with 20 shopkeepers will compare voice and touch entry, followed by interviews. Expected outputs are the corpus, a benchmark of on-device models for this task, and evidence on whether voice entry helps shopkeepers in practice.

**Keywords:** automatic speech recognition, on-device inference, code-mixing, spoken language understanding, Indian languages, low-literacy interfaces, digital bookkeeping, kirana retail, human–computer interaction for development

# 1. Introduction

## 1.1 Title of the Research

**Voice-First Khata: On-Device Speech-to-Ledger Entry for Code-Mixed Hindi–Marathi–English Credit Transactions in Kirana Stores**

The title names the intervention (voice entry into a credit ledger), where it runs (on the device, offline), the linguistic conditions (code-mixed Hindi, Marathi and English) and the setting (kirana stores). The dependent variables, accuracy and entry efficiency, are defined in Section 1.4.

## 1.2 Background of the Study

Informal credit holds together much of India's neighbourhood retail. A kirana owner lets regular customers take goods now and pay later, and keeps track in a khata book. Digitising this record matters economically. Among 403 Indian unorganised retailers, adopting digital payment technology raised revenue by 9.6% on average [@K2], and low-cost technology is seen as a way for kiranas to stay competitive [@K1]. Apps for digital khata are already available, but shopkeepers commonly keep a paper book as well. Part of the reason is simple: typing is slow at a busy counter.

The input problem is a well-known one in human–computer interaction for development. Text-heavy interfaces exclude users with limited literacy, and in Bangalore, Medhi et al. found that text-free designs using voice and images were strongly preferred by such users [@V11]. Voice also works on any phone and across literacy levels. Patel et al.'s seven-month deployment of a voice forum among farmers in Gujarat showed that users preferred voice to text [@V12]. A shopkeeper who can say "Sunita tai ne teen hazaar jama kele" and see it recorded correctly would not need to type at all.

Speech recognition for Indian languages has improved rapidly. Whisper, trained on 680,000 hours of weakly supervised multilingual audio, transcribes many languages without task-specific training [@V1]. AI4Bharat's IndicWav2Vec [@V3], its Vistaar benchmarks and IndicWhisper models [@V2], and the IndicVoices dataset of 7,348 hours from 16,237 speakers [@V5] have all raised the standard for Indian languages. Three obstacles remain for a kirana app, however:

1. **Connectivity.** The strongest models run in the cloud, and a khata app has to work when the network drops [@K3]. Distillation and compact architectures such as Distil-Whisper [@V7] and Moonshine [@V8] cut compute sharply. Both, however, report results mainly for English, and not on low-end Android phones.
2. **Code-mixing.** Shopkeepers mix Hindi, Marathi and English within a single sentence ("Ramesh ka 250 ka udhaar add karo"). Code-switched speech remains hard for recognisers trained mostly on monolingual data [@V4; @V6].
3. **Task structure.** A khata entry is not free dictation. It is a short command with a few slots that must be exactly right: who, how much, and whether it is a credit or a repayment. A small transcription error in a number ("dhai sau" heard as "do sau") becomes a ₹50 error in someone's account. Spoken language understanding research evaluates such slot-level accuracy [@V9], but no public benchmark covers Indian retail credit commands.

SmartOps, the offline-first point-of-sale and khata app built by the researchers, makes a concrete testbed for these obstacles. It already stores customers and khata entries locally, so any voice feature must run offline and resolve names against that local customer list.

## 1.3 Significance of the Study

**Academic value.** The study will provide the first corpus and benchmark of code-mixed Indian retail credit commands. It will also give evidence on how compressed, on-device recognisers perform on a structured, number-heavy task, measured at the level of the resulting ledger entry and not only by word error rate. It connects speech technology [@V1; @V2] with HCI-for-development findings on voice interfaces [@V11; @V12] and with technology-acceptance theory [@V14].

**Technical value.** The study will produce a speech-to-ledger pipeline that runs offline on a low-end phone, including Indian number-word normalisation and customer-name biasing from the local database. Its accuracy, latency and memory costs will be measured and published.

**Practical value.** Faster, literacy-independent entry could make a digital khata practical at the counter. Fewer entries would be postponed or forgotten, and the paper book would become unnecessary.

**Beneficiaries.** Kirana owners and their staff, especially those less comfortable with typing; developers of apps for informal businesses; and researchers building Indian-language speech technology.

**Contribution to knowledge.** The study contributes an answer to whether on-device recognisers are good enough for a financial entry task, which errors matter most, and whether voice entry helps real users. The answers come with measured confidence rather than product claims.

**SDG alignment.** The work supports **SDG 8.3** (support for micro and small enterprises), **SDG 9.c** (access to ICT) and **SDG 10.2** (social and economic inclusion of all, regardless of literacy or language). It does so by lowering the literacy and language barrier to digital record-keeping.

## 1.4 Aim, Objectives, Research Questions and Hypotheses

**Aim.** To assess whether on-device speech recognition can capture code-mixed Hindi, Marathi and English khata transactions offline, accurately enough for financial records and faster than touch entry for kirana shopkeepers.

**Objectives.**

- **O1.** To build KhataSpeech, a corpus of about 2,400 annotated khata utterances from 40 speakers across Hindi, Marathi, English and code-mixed speech, recorded in quiet and shop-noise conditions, with inter-annotator agreement of Cohen's κ ≥ 0.8 on slot labels.
- **O2.** To benchmark four recogniser configurations (cloud, on-device full-precision, on-device quantised, and Indic-adapted quantised) for word error rate, slot-level F1, amount accuracy, real-time factor and peak memory on a low-end and a mid-range Android phone.
- **O3.** To design a speech-to-ledger pipeline with Indian number-word normalisation and customer-name biasing from the local database, and to measure how much biasing improves customer-name accuracy.
- **O4.** To compare voice and touch entry in a within-subjects field study with 20 kirana shopkeepers on time on task, uncorrected error rate, System Usability Scale (SUS) score and acceptance constructs, and to explain the results through interviews.

**Research questions.**

- **RQ1** (O1, O2). How accurately do on-device recognisers transcribe code-mixed khata commands, and how does accuracy vary with language mode and noise?
- **RQ2** (O2). Is the best on-device configuration comparable to cloud recognition in slot-level accuracy, and at what latency and memory cost on a low-end phone?
- **RQ3** (O3). How much does biasing towards the shop's own customer names improve the resolution of the correct customer?
- **RQ4** (O4). Does voice entry reduce entry time without increasing ledger errors, compared with touch entry?
- **RQ5** (O4). How do shopkeepers perceive voice entry in terms of usefulness, effort and trust, and what explains their preferences?

**Hypotheses.**

- **H1.** The best on-device configuration's slot-level F1 is non-inferior to the cloud configuration within a 5-point margin. (*H1₀: it is worse by more than 5 points.*)
- **H2.** Customer-name biasing significantly increases the share of utterances resolved to the correct customer. (*H2₀: no difference.*)
- **H3.** Code-mixed utterances have higher word error rates than monolingual utterances, after controlling for speaker and noise. (*H3₀: no difference by language mode.*)
- **H4.** Voice entry has a shorter median time on task than touch entry, with an uncorrected error rate that is not higher. (*H4₀: time on task does not differ.*)
- **H5.** Shopkeepers rate voice entry higher than touch on SUS and on effort expectancy. (*H5₀: no difference.*)

# 2. Literature and Research Foundation

## 2.1 Literature Review

**Large-scale and Indian-language speech recognition.** Radford et al. showed that training on 680,000 hours of weakly labelled multilingual audio gives a recogniser, Whisper, that transfers zero-shot to many benchmarks and languages [@V1]. For Indian languages, Javed et al. pretrained wav2vec-style models on 17,000 hours across 40 languages and showed that multilingual pretraining is an effective strategy [@V3]. Bhogale et al. then assembled 59 benchmarks (Vistaar). Their IndicWhisper models had the lowest WER on 39 of them, but error rates varied widely with domain [@V2]. IndicVoices added 7,348 hours of mostly spontaneous speech from 145 districts [@V5]. These studies establish strong general-purpose baselines. They report word error on general speech, however, not the accuracy of the specific entities a transaction depends on.

**Code-mixing.** Sitaram et al.'s survey documents that code-switching harms both recognition and understanding, and that suitable datasets are scarce [@V6]. The MUCS 2021 challenge provided Hindi–English code-switched and multilingual Marathi and Hindi data, and showed that these settings remain difficult with low resources [@V4]. Hindi–Marathi–English mixing in retail commands has not been specifically studied.

**Efficient on-device models.** Gandhi et al. distilled Whisper into a model 5.8 times faster with 51% fewer parameters, within 1% WER on out-of-distribution English audio [@V7]. Jeffries et al.'s Moonshine needs five times less compute than Whisper tiny for a 10-second clip at equal WER [@V8]. These results target English and datacentre or desktop hardware; low-end Android phones running Indian-language models remain largely unmeasured.

**Spoken language understanding.** Bastianelli et al.'s SLURP benchmark evaluates extraction of intents and entities from speech, with a metric that credits partially correct entities. It shows that recognition errors carry through to understanding errors [@V9]. Morris et al. proposed match error rate and word information lost as better-behaved alternatives to WER [@V10]. Both lines of work are in English, and neither involves financial slots where one wrong digit changes the outcome.

**Voice interfaces for low-literacy users.** Medhi et al. found that text-free, voice-supported interfaces were strongly preferred by low-literacy users [@V11]. Patel et al.'s Avaaj Otalo field study with 51 farmers found voice preferred to text and effective across literacy levels [@V12]. These studies used recorded voice and touch-tone menus, not automatic recognition of free speech, and none dealt with bookkeeping.

**Acceptance and usability.** UTAUT holds that performance expectancy, effort expectancy, social influence and facilitating conditions predict intention to use a technology [@V14]. The SUS gives a quick 10-item usability score [@V13]. Kirana digitisation studies [@K1; @K2] use such constructs for payments, not for input modality.

Table: Summary of key prior studies

| Study | Focus | Method | Key finding | Limitation for this problem |
|---|---|---|---|---|
| Radford et al. [@V1] | Multilingual ASR | Large-scale training | Strong zero-shot transfer | Cloud-scale models; general speech |
| Bhogale et al. [@V2] | Indian ASR benchmarks | Benchmarking | IndicWhisper best on 39/59; WER varies by domain | No retail or command domain |
| Javed et al. [@V5] | Indian speech data | Corpus building | 7,348 h, 22 languages | No transaction slots |
| Diwan et al. [@V4] | Code-switched ASR | Shared task | Code-switching remains hard | No Hindi–Marathi–English mix |
| Gandhi et al. [@V7] | Model distillation | Experiment | 5.8× faster, near-equal WER | English; not phones |
| Bastianelli et al. [@V9] | Spoken language understanding | Benchmark | ASR errors carry through to entities | English; no financial slots |
| Medhi et al. [@V11] | Low-literacy UI | Ethnographic design | Text-free UI preferred | No ASR; no bookkeeping |
| Patel et al. [@V12] | Voice forum, rural India | Field study | Voice preferred to text | Recorded audio, not recognition |

## 2.2 Theories, Concepts and Existing Methodologies

**Error propagation in spoken language understanding.** In a pipeline, recognition errors propagate into the extracted meaning [@V9]. The theory predicts that WER alone will overestimate how usable a system is for transactions. A 10% WER concentrated on filler words is harmless, while the same WER on amounts is not. The study therefore evaluates at three levels: words, slots and ledger entries.

**Contextual biasing.** A recogniser can be steered towards expected vocabulary. Whisper, for example, accepts a text prompt that conditions its decoding [@V1]. In a khata app the expected vocabulary is known in advance: the shop's own customer names. Biasing with that list should raise name accuracy without retraining.

**Model compression.** Knowledge distillation [@V7], efficient architectures [@V8] and weight quantisation trade some accuracy for large gains in speed and memory. The question for this study is where that trade-off lands on 2–3 GB RAM phones for Indian-language commands.

**Code-switching** [@V6]. Speakers alternate between languages within an utterance, often switching to English for numbers and to the local language for verbs and particles. Numbers therefore pose a specific risk: "teen hazaar", "3000" and "three thousand" must all normalise to the same amount.

**Technology acceptance** [@V14]. Performance expectancy (will it help me?) and effort expectancy (is it easy?) are the constructs most directly affected by an input modality. Trust is added here because a wrong financial entry has social costs.

**Existing methodologies.** ASR research relies on *benchmark evaluation* on held-out sets with WER or CER [@V2; @V10]. SLU research uses *slot-level F1* [@V9]. HCI4D studies use *field deployments* and *interviews* [@V11; @V12]. Acceptance studies use *validated survey scales* [@V13; @V14]. Each on its own leaves a question open. Benchmarks do not show whether users benefit, and field studies do not isolate why the system fails. This study combines them in sequence.

Table: Variables drawn from the literature

| Variable | Type | Source | Operationalisation |
|---|---|---|---|
| Recogniser configuration | Independent | [@V1; @V2; @V7] | C1 cloud; C2 Whisper-small FP16 on-device; C3 Whisper-small INT8; C4 IndicWhisper INT8 |
| Name biasing | Independent | [@V1] | Off / on (local customer list as decoding prompt and fuzzy resolver) |
| Input modality | Independent (field) | [@V11; @V12] | Voice vs touch |
| Language mode | Moderator | [@V4; @V6] | Hindi; Marathi; English; code-mixed |
| Noise condition | Moderator | [@V2] | Quiet vs in-shop ambient |
| Device tier | Moderator | [@V8] | Low-end (2–3 GB RAM) vs mid-range (6–8 GB) |
| WER / CER / MER | Dependent | [@V10] | Per utterance |
| Slot F1, amount exact match, name accuracy | Dependent | [@V9] | Per utterance and slot |
| Real-time factor, latency, peak memory | Dependent | [@V7; @V8] | Measured on device |
| Time on task, uncorrected errors | Dependent (field) | [@V12] | App logs vs task sheet |
| SUS, PE, EE, BI | Dependent (field) | [@V13; @V14] | 5-point scales, translated |

## 2.3 Research Gap

1. **No benchmark for Indian retail credit commands.** Indian ASR benchmarks cover news, education and conversation [@V2; @V5], not short, number-heavy transaction commands with Hindi–Marathi–English mixing.
2. **On-device performance on low-end phones is unmeasured.** Compression studies report English results on capable hardware [@V7; @V8]. How Indian-language models behave in 2–3 GB of RAM, fully offline, is not documented.
3. **Accuracy is reported at the wrong level for financial tasks.** WER does not capture whether the right customer was charged the right amount. SLU slot metrics exist [@V9] but have not been applied to Indian financial commands.
4. **Voice UI evidence predates modern ASR.** HCI4D studies showing a preference for voice used recorded audio or touch-tone menus [@V11; @V12]. Whether *automatic recognition*, with its errors, keeps that advantage for shopkeepers has not been tested.

**Proposed gap solution.** The study builds the missing corpus, benchmarks on-device configurations at the word, slot and ledger levels, and adds low-cost context (the shop's own customer list) to the pipeline. It then tests the complete system with shopkeepers against the touch interface they would otherwise use.

## 2.4 Research Framework / Conceptual Framework

Figure 1 presents the framework. *System design* variables (recogniser configuration, name biasing, number normalisation) and the *input modality* are the independent variables. They affect *recognition quality* (WER, slot F1, amount and name accuracy) and *system cost* (latency, memory). Recognition quality and cost in turn shape *task performance* (time on task, uncorrected errors) and *user perception* (SUS, performance expectancy, effort expectancy, trust, intention). *Context* variables moderate these effects: language mode, noise, device tier and user literacy.

![Conceptual framework: system design and modality affect recognition quality and cost, which shape task performance and user acceptance, moderated by language, noise, device tier and literacy](figures/p2_framework.png){width=95%}

The framework draws on SLU error propagation [@V9] for the link from recognition quality to task performance, on compression trade-offs [@V7; @V8] for the link from configuration to cost, and on UTAUT [@V14] for the link from task performance to acceptance. HCI4D findings [@V11; @V12] motivate literacy as a moderator of the modality effect.

# 3. Research Problem and Design

## 3.1 Research Problem

Digital khata apps depend on typed entry, which is slow at a busy counter and excludes shopkeepers who are uncomfortable reading and typing. Voice entry could remove both barriers, but it must work offline, handle code-mixed speech, and capture names and amounts exactly. The deficiency is that there is no evidence on whether current on-device recognisers meet this bar, which errors dominate, or whether shopkeepers are faster and satisfied with voice entry once recognition errors are included. If this is left unresolved, voice features are either not built, or built on assumptions and then abandoned after the first wrong entry.

**Problem statement.** *It is not known whether on-device speech recognition, combined with number normalisation and customer-name biasing, can capture code-mixed Hindi, Marathi and English khata transactions offline with accuracy comparable to cloud recognition, nor whether it lets kirana shopkeepers record credit faster than touch entry without adding errors.*

## 3.2 Research Approach

The study uses a **mixed-methods** approach, weighted towards quantitative methods, in an explanatory sequential form. Accuracy, latency and entry time are measurable, and the hypotheses are testable, so the core is quantitative. However, adoption of a voice feature depends on how people experience its errors, on social comfort with speaking at the counter and on trust in the result. Numbers alone cannot explain those. Interviews after the field study are therefore used to interpret the quantitative results. This combination follows the HCI4D tradition of pairing usage measures with qualitative inquiry [@V12].

## 3.3 Research Design

The study has four stages.

- **Stage A: Corpus development (O1).** This is a *development* design. Scripted and semi-spontaneous prompts are generated from SmartOps seed data using fictional customer names, and are recorded on Android phones by 40 speakers in quiet and in-shop conditions.
- **Stage B: Benchmark experiment (O2, O3).** This is a *laboratory experiment* with a repeated-measures structure. Every utterance is processed by every configuration (C1–C4), with and without name biasing, on both device tiers, which controls for speaker and content. Speaker-disjoint splits are used if the optional fine-tuning of C4 is attempted.
- **Stage C: Prototype development.** The best configuration is built into SmartOps as a push-to-talk "voice khata" button. The pipeline runs ASR, normalisation, slot extraction and customer resolution, then shows a confirmation card, and the entry is written through the existing ledger functions. The confirmation card is kept by design, because financial entries should never be written silently.
- **Stage D: Field experiment and interviews (O4).** This is a *within-subjects field experiment* with 20 shopkeepers. Each participant completes 10 scripted khata tasks with voice and 10 with touch. The order is counterbalanced (AB/BA), with two practice tasks per modality, on a study phone with a test ledger. A 15-minute semi-structured interview follows.

The within-subjects design is chosen because shopkeepers differ widely in typing speed and literacy. Using each participant as their own control removes that variance and allows a sample of 20 to detect meaningful effects (Section 4.1).

Table: Stage B experimental conditions

| Factor | Levels |
|---|---|
| Recogniser configuration | C1 cloud; C2 Whisper-small FP16; C3 Whisper-small INT8; C4 IndicWhisper INT8 |
| Name biasing | Off; on |
| Device tier (C2–C4 only) | Low-end; mid-range |
| Language mode (observed) | Hindi; Marathi; English; code-mixed |
| Noise (observed) | Quiet; in-shop |

## 3.4 Scope of the Research

- **Research area.** Speech technology for Indian languages; human–computer interaction for development; digital bookkeeping for micro-enterprises.
- **Population.** Kirana shopkeepers and staff in urban and semi-urban Maharashtra who speak Hindi and/or Marathi and use an Android smartphone. The corpus also includes other adult speakers of these languages to widen speaker variety.
- **Variables.** As in Table 2.
- **Conditions.** Offline, on-device processing (the cloud configuration is a comparison baseline only); push-to-talk utterances of 2–8 seconds; quiet and ordinary shop noise.
- **Applications.** Voice entry for khata, and by extension for stock-in and sale entry, in SmartOps and similar apps; the corpus and benchmark are reusable for Indian-language command recognition.
- **Exclusions.** Credit scoring or any lending decision; always-on listening or wake words; speaker identification or voice biometrics; languages other than Hindi, Marathi and English; full conversational assistants; iOS devices; and training new recognisers from scratch.

# 4. Research Implementation and Evaluation

## 4.1 Data Collection

**Primary data.**

1. **KhataSpeech corpus.** 40 speakers (about 20 shopkeepers and 20 other adults, balanced by gender where possible). Each records 40 scripted and 20 semi-spontaneous prompts, for a total of about 2,400 utterances and 3–4 hours of audio. Prompts cover credit and repayment commands, amounts from ₹5 to ₹50,000 spoken as digits and as number words, and 60 fictional customer names. Recording uses a study app on two phone models, at 16 kHz, in quiet and in-shop settings.
2. **Annotations.** Each utterance gets an orthographic transcript (Devanagari, with English words in Latin script), a language-mode tag and slot labels (entry type, customer, amount, optional item and quantity). A second annotator labels a 10% random subset so that Cohen's κ can be computed.
3. **Benchmark logs.** For each utterance × configuration × condition: hypothesis text, extracted slots, decoding time, real-time factor and peak memory (from Android `dumpsys meminfo`). This gives about 2,400 × 4 × 2 × 2 ≈ 38,000 records.
4. **Field-study data.** For each of 20 participants: time-stamped app logs for 20 tasks plus practice tasks, the resulting ledger entries (compared with task sheets to count errors), SUS and UTAUT questionnaires for each modality, and interview audio transcribed and translated into English.

**Secondary data.** Vistaar and IndicVoices test subsets [@V2; @V5] are used to check that each configuration performs close to its published general-speech figures before the task-specific benchmark. SmartOps seed data supplies realistic product, customer and amount distributions for the prompts.

**Sample-size justification.** For the field study, a paired design with 20 participants gives 80% power at α = 0.05 (two-tailed) to detect a within-person effect of about d = 0.65 on time on task. For the benchmark, about 2,400 utterances give a 95% confidence-interval half-width of about ±2 percentage points on slot accuracy near 80%, before clustering by speaker. The speaker-level cluster bootstrap will widen this appropriately.

## 4.2 Tools and Techniques

Table: Tools and techniques

| Category | Item | Purpose |
|---|---|---|
| ASR models | Whisper-small (multilingual) [@V1]; IndicWhisper (Hindi/Marathi) [@V2]; a commercial cloud ASR API as baseline | Configurations C1–C4 |
| On-device runtime | whisper.cpp (GGML/GGUF INT8 quantisation) via a React Native native module | Offline inference on Android |
| Pipeline | Rule-based Indian number normaliser (digits, Hindi/Marathi number words, "saade/dhai/paune", hazaar/lakh); keyword grammar for entry type ("udhaar/baaki" vs "jama/diye/bhare"); transliteration-aware fuzzy matching (Jaro–Winkler) against local customers; decoder prompt biasing | Slot extraction and name resolution |
| App | SmartOps (React Native, WatermelonDB) with a push-to-talk "voice khata" screen and confirmation card | Prototype for the field study |
| Recording | Custom Android recording app; 16 kHz mono WAV | Corpus collection |
| Annotation | Label Studio (open source) | Transcripts and slot labels |
| Hardware | Low-end Android phone (2–3 GB RAM); mid-range Android phone (6–8 GB RAM); researchers' laptops; optional cloud GPU (Colab) | Benchmarking; optional fine-tuning of C4 |
| Instruments | SUS [@V13]; UTAUT performance expectancy, effort expectancy and intention items adapted from [@V14] with 3 trust items; all translated into Hindi and Marathi and back-translated | Field questionnaires |
| Qualitative | Semi-structured interview guide; reflexive thematic analysis [@V15] in Taguette (open source) | Interviews |
| Analysis | Python 3.12 (jiwer, pandas, statsmodels, SciPy, scikit-learn) | Metrics and statistics |

Figure 2 shows the speech-to-ledger pipeline.

![Speech-to-ledger pipeline: push-to-talk audio is transcribed on the device, numbers are normalised, slots are extracted, the customer is resolved against the local database, and the shopkeeper confirms before the entry is written to the khata ledger](figures/p2_pipeline.png){width=100%}

## 4.3 Data Analysis and Performance Measures

**Performance metrics.**

- *Recognition:* WER, CER and MER [@V10], per utterance and pooled.
- *Understanding:* slot-level precision, recall and F1 [@V9]; **amount exact-match accuracy** (the amount must be correct to the rupee); **name accuracy** (resolved to the correct customer ID); **entry accuracy** (all required slots correct).
- *Cost:* real-time factor (processing time ÷ audio duration), end-to-end latency from release of the button to the confirmation card, peak memory in MB, and model size on disk.
- *Field:* time on task in seconds; uncorrected error rate (entries that differ from the task sheet after confirmation); correction count; SUS (0–100); scale means for performance expectancy, effort expectancy, trust and behavioural intention.

**Statistical techniques.**

- **H1.** The difference in slot F1 between the best on-device configuration and C1 will be estimated with a **speaker-level cluster bootstrap** (10,000 resamples). The 95% CI will then be compared with the −5-point **non-inferiority margin**.
- **H2.** Name accuracy with and without biasing on the same utterances will be compared with **McNemar's test**, reporting the odds ratio of discordant pairs.
- **H3.** A **linear mixed-effects model** of utterance-level WER (log-transformed if skewed) will be fitted, with fixed effects for configuration, language mode, noise and their interactions, and random intercepts for speaker and prompt. Planned contrasts will compare code-mixed with each monolingual mode (Holm-corrected).
- **H4.** Median time on task per participant will be compared across modalities with a **paired t-test**, or with a **Wilcoxon signed-rank test** if the differences are not normal (Shapiro–Wilk). Uncorrected errors will be modelled with a **binomial GLMM** (modality fixed, participant random) and tested for non-inferiority.
- **H5.** SUS and scale scores will be compared with **Wilcoxon signed-rank** tests. Scale reliability will be checked with **Cronbach's α** (≥ 0.7).
- **Reliability of annotations:** Cohen's κ on slot labels.
- **Qualitative:** interviews will be coded with reflexive thematic analysis [@V15] (familiarisation, coding, theme development and review), with two researchers coding independently and resolving differences by discussion. Themes will be set alongside the quantitative results in a joint display to explain, for example, why some participants were slower with voice.
- Effect sizes (Cohen's d, rank-biserial r, odds ratios) will be reported for all tests; α = 0.05.

**Comparisons.** On-device configurations will be compared with the cloud configuration, quantised with full-precision models, Indic-adapted with general models, and biased with unbiased decoding. Voice will be compared with touch in the field, and code-mixed with monolingual speech, low-end with mid-range phones, and quiet with shop noise.

## 4.4 Expected Outcomes

The following are expectations from the literature, stated so that they can be proved wrong. They are not results.

- **Recognition.** WER is expected to be highest for code-mixed and noisy utterances [@V4; @V6], and quantisation is expected to cost a small amount of accuracy in exchange for large memory savings [@V7]. The Indic-adapted configuration is expected to perform best on Hindi and Marathi speech [@V2].
- **Understanding.** Amount errors are expected to cluster on fractional number words ("saade", "paune", "dhai") and on English-versus-Hindi number switching. The normaliser should remove a large share of these. Name biasing is expected to give the largest single gain in entry accuracy, because customer names are rare words that general models mis-transcribe.
- **Cost.** The quantised small model is expected to run within the memory of a 2–3 GB phone with latency of a few seconds for short commands. If that fails, the study will report this as a finding and test a smaller model.
- **Field.** Voice is expected to be faster for most participants. The confirmation step is expected to keep uncorrected errors at or below the touch level. Participants who type slowly are expected to gain the most. Interviews are expected to raise concerns about speaking customers' debts aloud in front of others, which would be an important design constraint.
- **Proposed solution.** The deliverables are a working offline voice-khata module for SmartOps, the KhataSpeech corpus (released only with participants' separate consent), and a benchmark table that other developers can use to choose models for Indian-language command entry.

# 5. Research Management and Output

## 5.1 Limitations

- **Technical.** Only a few model families and two phone models are tested, and results may differ on other chipsets. The pipeline's rule-based slot extractor may not cover every phrasing, although the semi-spontaneous prompts partly test this.
- **Data.** A corpus of about 2,400 utterances is small by ASR standards and is suited to evaluation, not to training large models. Fictional names and scripted amounts may not match real khata speech in every respect.
- **Resource.** Recruiting 20 working shopkeepers for 45 minutes each is demanding, since their time has a cost. Sessions will be scheduled in quiet hours, and some recruitment may rely on personal networks.
- **Time.** The 16-week schedule allows one field session per participant. Learning effects and long-term adoption are not measured.
- **Financial.** The budget allows small incentives and two devices, not a large deployment or a professional annotation team.
- **Methodological.** The field study uses scripted tasks on a study phone. This gives control, but it is less realistic than observing real entries in the shop's own books. Counterbalancing reduces order effects but cannot remove them. Language coverage is limited to Hindi, Marathi and English.

## 5.2 Research Work Plan and Gantt Chart

The work is planned over 16 weeks from the date the proposal is approved.

Table: Work plan, milestones and deliverables

| # | Activity | Weeks | Deliverable |
|---|---|---|---|
| 1 | Detailed literature review | 1–3 | Review chapter |
| 2 | Ethics application; translation and back-translation of instruments | 2–4 | Approval letter; translated forms and scales |
| 3 | Prompt design and pilot recording (5 speakers) | 3–5 | Final prompt set |
| 4 | Corpus recording (40 speakers) | 5–8 | Raw audio |
| 5 | Annotation and agreement check | 6–9 | Annotated KhataSpeech corpus; κ report |
| 6 | Pipeline development (normaliser, slots, biasing, app integration) | 5–10 | Voice-khata module |
| 7 | On-device benchmarking | 9–11 | Benchmark dataset |
| 8 | Field experiment and interviews (20 shopkeepers) | 11–13 | Field logs, questionnaires, transcripts |
| 9 | Quantitative and thematic analysis | 12–14 | Results and joint display |
| 10 | Report writing and review | 13–16 | Final research report |

**Milestones:** M1 (week 3): literature review complete; M2 (week 4): ethics approval; M3 (week 8): corpus recorded; M4 (week 11): benchmark complete; M5 (week 13): field study complete; M6 (week 16): final report submitted.

![Gantt chart of the 16-week work plan with milestones M1–M6](figures/p2_gantt.png){width=100%}

## 5.3 Cost Estimation / Budget

Figures are estimates in Indian rupees.

Table: Estimated budget

| Head | Item | Qty × rate | Amount (₹) |
|---|---|---|---|
| Equipment | Low-end Android phone (2–3 GB RAM) for benchmarking and field study | 1 × 7,000 | 7,000 |
| Equipment | Mid-range Android phone | Borrowed from a researcher | 0 |
| Software | Whisper, IndicWhisper, whisper.cpp, Label Studio, Taguette, Python | Open source | 0 |
| Cloud | Cloud ASR API usage for the C1 baseline (≈4 h audio) | Lump sum | 1,000 |
| Cloud | GPU notebook for optional fine-tuning of C4 | 2 months × 1,000 | 2,000 |
| Data collection | Speaker incentives for corpus recording | 40 × 200 | 8,000 |
| Data collection | Shopkeeper incentives for field study (~45 min each) | 20 × 300 | 6,000 |
| Data collection | Second annotator for agreement subset (10%) | Lump sum | 3,000 |
| Materials | Translation checks; printing of consent forms, task cards and questionnaires | Lump sum | 3,000 |
| Travel | Local travel to shops for recording and field sessions | ≈25 visits × 160 | 4,000 |
| Testing | Benchmark runs on own devices and laptops | Existing hardware | 0 |
| Publication | Student registration at a national IEEE conference (optional) | 1 × 7,500 | 7,500 |
| Miscellaneous | Contingency (≈10% of the above) | — | 4,100 |
| **Total** | | | **45,600** |

Without the optional conference registration, the total is ₹38,100.

## 5.4 Expected Contribution, Ethical Considerations and References

**Expected contribution.**

- *Knowledge.* The study will provide evidence on how well on-device recognisers handle code-mixed Indian financial commands, which error types matter, and whether voice entry helps shopkeepers once recognition errors are included.
- *Technical.* It will deliver an offline speech-to-ledger pipeline with Indian number normalisation and database-driven name biasing, and a benchmark of accuracy against cost on low-end phones.
- *Practical.* A voice-khata feature in SmartOps that shopkeepers can use without typing or connectivity, together with design guidance for such features (for example, keeping confirmation and avoiding reading debts aloud).
- *Methodological.* An evaluation approach that measures speech systems at the word, slot and ledger levels and links benchmark results to field outcomes. The KhataSpeech protocol can also be reused for other Indian-language command tasks.

**Ethical considerations.**

- *Approval.* The study involves human participants and voice recordings. The full protocol, information sheets, consent forms and interview guide will be submitted to the institutional ethics committee, and no recruitment will begin before approval.
- *Consent.* Information sheets and consent forms will be provided in Marathi, Hindi and English and read aloud where needed. Participants may sign or give a thumb impression with a witness. Consent is taken separately for (a) recording, (b) sending their scripted clips to the cloud baseline, and (c) any future release of anonymised audio. Participation is voluntary, incentives are modest so that they are not coercive, and participants can withdraw at any time and have their recordings deleted.
- *Privacy.* All prompts use fictional customer names and amounts. Participants are asked not to mention real customers, and the field study uses a test ledger on a study phone, never the shop's real accounts, so no real customer's financial data is collected. Voice is identifiable personal data, so recordings are labelled with random speaker IDs and stored separately from the key linking IDs to names. Processing on the device is itself a privacy measure, since in the proposed system audio never leaves the phone.
- *Data security.* Audio and transcripts are kept in encrypted, access-controlled storage available only to the researchers. The linking key is destroyed after analysis. Raw audio is deleted 12 months after submission unless the participant has consented to anonymised release. Handling follows India's Digital Personal Data Protection Act, 2023 [@K4]: notice, specific consent, purpose limitation and erasure on withdrawal.
- *Plagiarism.* All sources are cited in IEEE style. The report will be checked with the institution's similarity software, and all figures, tables and instruments are original or adapted with attribution.

# References
