# Literature review, explained paper by paper

Companion to `final/Voice_Khata_Proposal.pdf` (Section 2.1). Reference numbers [n] are the report's numbers. For each paper: what they did, why, how, what they found, what it does not cover, and how we use it. The last line of each entry is what you can say in the viva if asked about that paper.

---

## How the review is organised

The 16 papers are in time order, in four periods. Each period solved something the one before it could not, and each left something open.

| Period | What it settled | What it left open |
|---|---|---|
| 2003–2010 | Voice suits low-literacy users; word error rate is an imperfect measure | No automatic recognition, and no money-based measure |
| 2019–2021 | Mixed Indian speech is hard; judge a command by its extracted details | English datasets; error measures not tied to money |
| 2022–2024 | Big multilingual models and large Indian speech datasets exist | Tested on general speech, on servers, with large models |
| 2025–2026 | Whisper can be adapted to Indian and mixed speech, and compressed to 8 bits | English test sets, server hardware, still scored by word errors |

Our study sits at the end of this line: offline recognition on a cheap phone, for mixed Hindi–Marathi–English khata commands, scored in rupees.

---

# Period 1: Word errors and voice for low-literacy users (2003–2010)

## [11] Wang, Acero and Chelba (2003): Is word error rate a good indicator for spoken language understanding accuracy?
*IEEE Workshop on Automatic Speech Recognition and Understanding (ASRU), pp. 577–582.*

- **What they did.** They questioned a belief that everyone held at the time: that if you lower the word error rate of a recogniser, the system will also understand the user better.
- **Why.** Speech systems are built in two stages: speech to text, then text to meaning. Teams were optimising the first stage and assuming the second would follow.
- **How.** They worked on a spoken language understanding system and changed how the recogniser's language model was trained, using an example-based learning method that optimised understanding accuracy rather than word accuracy.
- **What they found.** Lower word error rate does not always mean better understanding. What mattered more was training the recogniser to match the understanding task.
- **What it does not cover.** It is in English, and it says nothing about numbers, amounts or money.
- **How we use it.** This is the oldest support for our main idea: counting wrong words is not the same as measuring whether the system did the right thing. It sets up the Rupee Error Rate.
- **Say this:** "Back in 2003 Wang and colleagues showed that a better word error rate does not always mean the system understood you better, so we should measure what the task actually cares about."

## [12] Morris, Maier and Green (2004): From WER and RIL to MER and WIL
*Interspeech, pp. 2765–2768.*

- **What they did.** They examined word error rate as a measure and proposed two better-behaved alternatives: match error rate (MER) and word information lost (WIL).
- **Why.** Word error rate has awkward properties. For example, it is not capped at 100%, because insertions can push it above the number of words spoken, which makes it hard to read as a proportion.
- **How.** They analysed how the measures behave on recognition output and compared them with earlier information-based measures.
- **What they found.** MER and WIL keep the useful part of word error rate while behaving more sensibly as proportions.
- **What it does not cover.** All three measures still treat every word as equally important. A wrong "ko" and a wrong "250" count the same.
- **How we use it.** It shows that improving the *measure* is a legitimate research contribution, which is what we do, except that we weight by money instead of by words.
- **Say this:** "People have already improved on word error rate, but only at the word level; nobody has weighted errors by what they cost."

## [3] Medhi, Sagar and Toyama (2007): Text-free user interfaces for illiterate and semiliterate users
*Information Technologies and International Development, vol. 4, no. 1, pp. 37–50.*

- **What they did.** They designed and tested interfaces that use no text at all, for users who cannot read.
- **Why.** Most software assumes reading. In India that shuts out a large group of users, including many small shopkeepers and their staff.
- **How.** Ethnographic design work with domestic workers in Bangalore slums, followed by two applications: a job-search tool and a map, built with voice and pictures instead of text.
- **What they found.** The text-free designs were strongly preferred over text ones, and users could complete tasks without help from anyone.
- **What it does not cover.** The voice was recorded audio, not speech recognition. Nothing had to be understood by a machine.
- **How we use it.** It supports the case that voice is the right input for our users, and it is the reason we test with shopkeepers rather than only students.
- **Say this:** "The HCI work in India is clear that voice beats text for low-literacy users, but those systems only played audio; they never had to understand it."

## [4] Patel, Chittamuru, Jain, Dave and Parikh (2010): Avaaj Otalo: a field study of an interactive voice forum for small farmers in rural India
*ACM CHI, pp. 733–742.*

- **What they did.** They ran a voice-based question-and-answer forum on ordinary phone lines for small farmers in Gujarat, and studied how it was used.
- **Why.** Farmers needed agricultural advice, but text services and the internet were out of reach for most of them.
- **How.** A seven-month deployment, with usage logs and interviews with 51 farmers.
- **What they found.** The forum was the most popular feature, social norms formed around it, and voice was preferred to text.
- **What it does not cover.** It used recorded voice messages and keypad menus, so again nothing had to be recognised automatically. It is also a discussion service, not data entry.
- **How we use it.** It is our evidence that voice services get real use in rural and small-business India over long periods, not just in lab tests.
- **Say this:** "Voice services have worked in the field in India for months at a time, so the interest is proven; what is new is asking software to understand the speech correctly."

---

# Period 2: Mixed languages and judging by the details (2019–2021)

## [13] Sitaram, Chandu, Rallabandi and Black (2019): A survey of code-switched speech and language processing
*arXiv:1904.00784.*

- **What they did.** They surveyed research on code-switching, where a speaker changes language inside one sentence, across both speech and text.
- **Why.** Code-switching is normal in India and other multilingual places, but most models are trained on one language at a time.
- **How.** A review of methods, available datasets and the tasks each dataset supports.
- **What they found.** Code-switching makes both recognition and understanding harder, and there is very little suitable data.
- **What it does not cover.** It is a survey, so no new experiments, and it does not cover Marathi mixing or shop commands.
- **How we use it.** It explains why our mixed-language clips are the hard case, and why we label the language of every clip.
- **Say this:** "Mixing languages inside one sentence is known to hurt recognition, and there is very little data for it, which is why our clips are labelled by language."

## [14] Bastianelli, Vanzo, Swietojanski and Rieser (2020): SLURP: a spoken language understanding resource package
*EMNLP, pp. 7252–7262.*

- **What they did.** They released SLURP, a large English dataset of spoken commands to a home assistant across 18 domains, with baselines and a new way to score entity extraction.
- **Why.** Spoken language understanding research had small datasets, and evaluation focused on words rather than on the details a system must extract.
- **How.** They recorded many spoken versions of commands, ran speech recognition plus understanding models, and scored the extracted entities directly.
- **What they found.** Mistakes in the transcript carry through into mistakes in the extracted details, so word-level accuracy hides what actually breaks.
- **What it does not cover.** English only, and the entities are things like dates and device names, never money.
- **How we use it.** It is the reason our main measure is "was the whole entry right", meaning name, amount and type, rather than word error rate.
- **Say this:** "SLURP showed that you should score the details a system extracts, not just the words; we take that one step further and score the money."

## [9] Diwan et al. (2021): MUCS 2021: multilingual and code-switching ASR challenges for low-resource Indian languages
*Interspeech, pp. 2446–2450.*

- **What they did.** They organised a shared challenge with two tasks: one multilingual recogniser for six Indian languages including Marathi and Hindi, and code-switched recognition for Hindi–English and Bengali–English.
- **Why.** Indian languages had little labelled data, and code-switched speech had almost none, so there was no common ground to compare methods.
- **How.** They released about 600 hours of speech across seven languages with blind test sets, and compared the systems teams submitted.
- **What they found.** Both tasks remain difficult in low-resource conditions, and code-switched speech was the harder of the two.
- **What it does not cover.** Everything is scored with word-level errors, and the speech is not shop or transaction speech.
- **How we use it.** It is our evidence that Hindi–English mixing is a real research problem, not something we invented, and it names Marathi as a low-resource language.
- **Say this:** "A whole shared challenge was needed just to benchmark Indian and code-switched speech, and it showed that mixed speech is the hardest case."

## [15] Gordeeva, Ershov, Gulyaev and Kuralenok (2021): Meaning Error Rate: ASR domain-specific metric framework
*ACM SIGKDD Conference on Knowledge Discovery and Data Mining (KDD), pp. 458–466.*

- **What they did.** They proposed a framework for measuring recognition quality by whether the meaning survives, tailored to each application.
- **Why.** In industry, one team's improvement can make another team's application worse, because each application cares about different words.
- **How.** They defined a metric framework where the application decides which differences matter, instead of counting all word edits equally.
- **What they found.** A single general-purpose measure is not enough; a task-specific measure reflects real quality better.
- **What it does not cover.** The framework is generic. Nothing in it converts an error into money, and it is not about Indian languages or offline use.
- **How we use it.** This is the closest ancestor of the Rupee Error Rate. Our contribution is the money-specific version of this idea, with a clear rule for what an error costs.
- **Say this:** "This paper argued that every application needs its own error measure; for a khata the natural unit is rupees, and that is exactly what we build."

---

# Period 3: Large multilingual and Indian-language models (2022–2024)

## [16] Javed et al. (2022): Towards building ASR systems for the next billion users
*AAAI, vol. 36, no. 10, pp. 10813–10821.*

- **What they did.** They collected 17,000 hours of raw speech in 40 Indian languages and pretrained wav2vec-style models on it (IndicWav2Vec).
- **Why.** Indian languages had far too little labelled data to train recognisers one language at a time.
- **How.** Self-supervised pretraining on unlabelled audio from sources such as news and education, then fine-tuning per language. They also analysed what the models learn, for example that similar-sounding units are shared across languages.
- **What they found.** Training on many Indian languages together is an effective way to build recognition for languages with little data. They released the models and data pipeline.
- **What it does not cover.** The models still need fine-tuning per language and are not built for a cheap phone; evaluation is word error rate on general speech.
- **How we use it.** It is the background for why Indian-language recognition is now possible at all, and it is the alternative model family to Whisper.
- **Say this:** "Indian-language recognition became practical when groups pooled 40 languages into one pretrained model, but those models are still big and tested on general speech."

## [5] Radford et al. (2023): Robust speech recognition via large-scale weak supervision (Whisper)
*ICML, PMLR vol. 202, pp. 28492–28518.*

- **What they did.** They trained Whisper on 680,000 hours of audio and transcripts collected from the internet, covering many languages and several tasks.
- **Why.** Earlier systems needed careful per-dataset training and broke on audio that did not match their training data.
- **How.** Weak supervision, meaning they used the imperfect transcripts that came with the audio rather than hand-cleaned data, and trained one model for transcription, translation and language identification.
- **What they found.** The models work on many test sets without any task-specific training, and come close to human-level accuracy on some of them.
- **What it does not cover.** The results are for general speech, mostly with large models, and Indian-language performance varies. It says nothing about running on a phone.
- **How we use it.** Whisper is the model we run offline, in its "small" size, quantised to 8 bits. It is free and supports Hindi and Marathi, so a student team can use it without training anything.
- **Say this:** "Whisper is our base model because it is free, multilingual and works without task-specific training, but the paper reports general speech on big machines."

## [6] Bhogale et al. (2023): Vistaar: diverse benchmarks and training sets for Indian language ASR
*Interspeech, pp. 4384–4388.*

- **What they did.** They assembled Vistaar, 59 benchmarks across Indian languages and domains, and trained IndicWhisper by fine-tuning Whisper on Indian data.
- **Why.** Indian-language results were being reported on whichever test set suited a paper, so numbers were not comparable, and nobody knew how models behaved across domains.
- **How.** They combined public datasets into a benchmark suite, then fine-tuned Whisper on about 10,700 hours across 12 Indian languages, and evaluated several open and commercial systems.
- **What they found.** IndicWhisper had the lowest word error rate on 39 of the 59 benchmarks, and error rates varied a lot between domains such as news and conversation.
- **What it does not cover.** None of the 59 benchmarks is shop, billing or khata speech, and all the scoring is word-level.
- **How we use it.** Two ways: it tells us domain matters, which is why we build our own small test set, and it names the Indic-tuned model we would try if plain Whisper is weak.
- **Say this:** "Even the best Indian-language model changes a lot from domain to domain, and none of those domains is a shop, so we cannot assume the published numbers apply to us."

## [17] Gandhi, von Platen and Rush (2023): Distil-Whisper
*arXiv:2311.00430.*

- **What they did.** They made a smaller, faster copy of Whisper by distillation.
- **Why.** Whisper is accurate but heavy, which blocks it from real-time and on-device use.
- **How.** They generated pseudo-labels with the large model on a large amount of audio, kept only the high-quality ones using a word-error-rate threshold, and trained a smaller student model on them.
- **What they found.** The student is 5.8 times faster with 51% fewer parameters, and stays within 1% word error rate of the original on out-of-distribution English audio. It also hallucinates less on long audio.
- **What it does not cover.** English only, and the evaluation is not on phone hardware.
- **How we use it.** It is our evidence that a shrunk Whisper can keep most of its accuracy, which is the assumption behind using an 8-bit model on a cheap phone.
- **Say this:** "Shrinking Whisper has been shown to keep accuracy within about one percent, but that was English on a computer, so we test it for ourselves."

## [7] Javed et al. (2024): IndicVoices
*Findings of ACL 2024, pp. 10740–10782.*

- **What they did.** They built IndicVoices, 7,348 hours of natural speech from 16,237 speakers across 145 districts and 22 languages, and used it to build IndicASR.
- **Why.** Earlier Indian datasets were mostly read speech from a narrow group of speakers, so models did not cope with ordinary people speaking naturally.
- **How.** A large field collection effort with standard protocols, prompts and quality checks. Most of the audio is extempore or conversational rather than read.
- **What they found.** It is the largest and most varied Indian speech collection so far, and it supports a recogniser covering all 22 scheduled languages.
- **What it does not cover.** Conversation and answers to prompts, not short commands with a name and an amount. The models are far too large for a cheap phone.
- **How we use it.** It shows that our kind of data, short khata commands, does not exist even in the biggest Indian collection, which is part of our gap.
- **Say this:** "The largest Indian speech dataset has over seven thousand hours, and still none of it is someone telling a shop app to record 250 rupees of credit."

---

# Period 4: Adapting Whisper to Indian speech and small devices (2025–2026)

## [18] Tripathi, Gothi and Wasnik (2025): Enhancing Whisper's accuracy and speed for Indian languages
*IEEE ICASSP 2025.*

- **What they did.** They improved Whisper for Indian languages in two ways at once: accuracy and speed.
- **Why.** Whisper is weak on low-resource Indian languages, and it is also slow because it produces many tokens for Indian scripts.
- **How.** Prompt-tuning that tells the model which language family it is hearing, plus a new tokenizer that produces fewer tokens per sentence.
- **What they found.** Accuracy improved and inference time fell across Whisper sizes, giving a better balance of the two.
- **What it does not cover.** Results are word error rate on general Indian-language speech; there is no test of short commands, no offline phone deployment and no money measure.
- **How we use it.** It shows that small, cheap changes around the model, rather than retraining it, can help a lot. Our customer-name hint is the same kind of trick.
- **Say this:** "Recent work gets more out of Whisper for Indian languages with prompts and a better tokenizer, which is the same spirit as our customer-name hint."

## [10] Biswas, Shevelev, Abdaoui, Tyagi and Boumadane (2025): Adapting Whisper for low-resource Hindi–English code-mix speech
*Interspeech, pp. 4293–4297.*

- **What they did.** They adapted Whisper to Hindi–English mixed speech when very little mixed training data exists.
- **Why.** Code-mixing is everywhere in India, but labelled code-mixed audio is scarce, so models trained on clean single-language data fail.
- **How.** Three things: language prompts during fine-tuning, simulating code-mixed audio on the fly during training, and using a large language model (Llama) to write code-switched sentences that were then turned into audio.
- **What they found.** These techniques gave promising gains on a Hindi–English code-switched dataset with limited data.
- **What it does not cover.** Hindi and English only, so no Marathi. The work is about fine-tuning on servers, not running offline on a phone, and it reports word error rate.
- **How we use it.** It is the closest paper to our language setting, and the clearest evidence that our mixed-language case is still an open problem in 2025.
- **Say this:** "As recently as this year, people are still working out how to make Whisper handle Hindi–English mixing, and that work does not cover Marathi or offline phones."

## [19] Söhler, Irigoyen and Kirkedal (2026): Quantizing Whisper-small: how design choices affect ASR performance
*SPEAKABLE Workshop at LREC 2026.*

- **What they did.** They compared ways of compressing Whisper-small after training, across four software libraries.
- **Why.** Quantisation is the standard way to make a model small enough for limited hardware, but the choice of method and bit width changes the result, and teams were choosing blindly.
- **How.** Post-training quantisation with PyTorch, Optimum-Quanto, HQQ and bitsandbytes, evaluated on the LibriSpeech test-clean and test-other English sets, run on server CPUs and GPUs.
- **What they found.** Dynamic 8-bit quantisation gave the best trade-off: 57% smaller with a slightly better word error rate than the baseline. More aggressive compression reached about 71% smaller but hurt accuracy on noisy audio, and static quantisation did poorly for this architecture.
- **What it does not cover.** English audio only, tested on powerful servers, and the authors themselves note that LibriSpeech does not represent spontaneous speech in the field.
- **How we use it.** It justifies our exact choice: Whisper-small at 8 bits, not 4 bits. It also gives us the open question we answer: does that hold for Hindi and Marathi on a cheap phone, in a noisy shop?
- **Say this:** "The newest work says 8-bit Whisper-small keeps its accuracy, but that was English on a server, so testing it on Indian speech on a 6,000-rupee phone is exactly our contribution."

---

# Supporting sources (used elsewhere in the report)

| [n] | Source | Where we use it | What it gives us |
|---|---|---|---|
| [1] | Adhikary et al. (2021), *J. Acad. Marketing Sci.* | Background, significance | Digital payment tools raised revenue by 9.6% on average across 403 Indian unorganised retailers |
| [2] | Choudhary and Aithal (2023), *IIM Kozhikode Soc. Manage. Rev.* | Background | Low-cost technology matters for kirana competitiveness |
| [8] | GSMA (2023), State of Mobile Internet Connectivity | Problem, scope | Coverage exists but usage and quality gaps persist, so offline capability is needed |
| [20] | Brooke (1996), SUS | Methodology, usability test | A 10-question usability score from 0 to 100 |
| [21] | Digital Personal Data Protection Act, 2023 | Ethics | Consent, purpose limitation and deletion rules for the voice recordings |

---

# The four gaps, and which papers create them

| Gap | Comes from | What we do about it |
|---|---|---|
| **1. No test on khata-style commands.** Indian benchmarks cover news, lectures and conversation | [6], [7] | Build a 360-clip test set of khata commands with known answers |
| **2. No money-based error measure.** Better measures exist, but all at word or meaning level | [11], [12], [15] | Define and report the Rupee Error Rate |
| **3. Offline performance on cheap phones is unknown.** Compression is tested on English, on servers | [17], [19] | Run 8-bit Whisper-small on a 2–3 GB Android phone and report accuracy, time and memory |
| **4. Voice versus typing with real recognition.** Earlier Indian voice studies used recorded audio | [3], [4] | A 10-person test where voice competes with typing, errors included |

---

# Questions an examiner may ask about the review

**"Why time order instead of by theme?"**
Because the story is a chain. Voice was known to suit these users, then mixed speech was shown to be hard, then the models arrived, then people shrank them. Each period removes one barrier, and what's left over is our project.

**"Which single paper is closest to yours?"**
Two, for different reasons. Gordeeva et al. [15] is closest on the measure, because they argued each application needs its own error measure. Biswas et al. [10] is closest on the setting, because they work on Hindi–English mixing with Whisper.

**"Are these papers recent enough?"**
Ten of the sixteen are from 2020 or later, and three are from 2025 and 2026. The older ones are there because they establish the two ideas we build on: voice suits low-literacy users, and word error rate is not the right measure.

**"How did you verify them?"**
Every reference was checked against the publisher or the official archive page, such as the ACL Anthology, ISCA Archive, IEEE, ACM, PMLR or AAAI, and we recorded the volume, pages and DOI where the page shows them.

**"What if a reviewer finds a paper you missed?"**
That is likely; the area moves fast. Our claim is narrow and stays safe: we found no study that scores speech errors in money, for mixed Hindi–Marathi–English khata commands, running offline on a low-cost phone.
