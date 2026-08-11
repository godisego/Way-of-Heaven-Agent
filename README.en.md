<div align="center">

# Way of Heaven Agent · 天道智能体

[简体中文](README.md) · English

**An open-source learning lab for AI agents — hand-written, framework-free RAG and tool loops, set in a three-mentor tea house with traceable classical sources.**

[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-087ea4?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/vitest-passing-6da55f)](docs/verification-plan.md)
[![Local First](https://img.shields.io/badge/data-local--first-8a5f38)](#10--data-and-privacy)
[![License: MIT](https://img.shields.io/badge/License-MIT-a8473c)](LICENSE)

<img src="docs/assets/screenshot-chat.png" alt="Three-mentor tea-house conversation interface" width="820" />

</div>

---

## 1 · What this is

This project exists for two purposes. Its primary focus is **learning AI agents**: implementing RAG, citation validation, and a minimal tool loop from scratch, then turning each mechanism into a lesson in a learning center. Its second focus is **learning Bazi**: making a Four Pillars chart into an interactive teaching aid, where every stem, branch, Ten God, and luck cycle can be explored. The product takes the form of a night-time tea house.

You arrive with a concern and sit down with three resident mentors. They respond in a fixed sequence by default; you can also select one or two mentors by clicking their portraits. They do not rely on canned conversation or play savior. Their answers must cite books **you uploaded yourself**. Every citation opens the matching PDF page or source section for verification, and fabricated citations are rejected programmatically.

| | Seat | Who | What they offer |
| --- | --- | --- | --- |
| <img src="public/avatars/hu.png" width="56" /> | Right seat · Timing | **Old Hu, blind-school Bazi practitioner** — an experienced, plain-spoken elder; speaks first | Patterns, timing windows, advance/retreat guidance, and a concrete next action |
| <img src="public/avatars/li.png" width="56" /> | Left seat · Wakefulness | **Li, existentialist mentor** — a Camus-inspired conversational partner; speaks second | Unpacks self-deception, returns agency, and suggests one executable step |
| <img src="public/avatars/xuan.png" width="56" /> | Host seat · Transformation | **Xuan, the Taoist host** — concludes the conversation | Integrates the other two views, offering direction, rhythm, and room to breathe |

Three principles guide the implementation: **local-first** (data stays on the machine), **deterministic-first** (code calculates charts and rules; models interpret them), and **learning-first** (all RAG and agent mechanisms are hand-written, so the project itself is the teaching material).

## 2 · Core capabilities

**Minimal agent tool loop** — By default, a coordinator model gathers evidence through `search_library`, `read_source_unit`, and `ready_to_answer`. Arguments are validated with Zod, call counts and timeouts are limited, and the evidence ledger is deduplicated. The system then drafts the three-mentor response and validates both citations and voice. Stopping conditions and each step are inspectable. The **Trace** switch returns to fixed RAG for comparison, while the answer exposes an **execution-trace panel (M4)**. See [`docs/agent-loop-design.md`](docs/agent-loop-design.md); verify with `npm run acceptance`. The third Agent-path lesson walks through the design.

**Three-mentor dialogue (selectable mentors + scoped RAG + citation validation)** — Portraits in the header let you invite or dismiss mentors while keeping at least one. Bazi and luck-cycle questions can be answered by Old Hu alone. The choice affects the API, retrieval scope, prompts, citations, and voice validation — it is not merely visual. Each mentor may cite only their own library (Li: existentialism/Stoicism; Hu: I Ching, Bazi, and Chinese classics; Xuan: Taoist and Chinese classics; untagged documents are shared). Citations use `[Book title, location]` and are checked against retrieved evidence. A missing or out-of-scope source invalidates **the whole set of citations and triggers a targeted retry**. A deterministic voice validator prevents the mentors from collapsing into one generic AI voice.

**Learning center and learning library (two paths, agent-focused)** — The **Learn** control provides 11 in-page guided lessons: six Agent-path lessons on RAG, trust chains, tool loops, persona engineering, the agent landscape, and trace debugging; the Bazi path has six stages and seventeen lessons on recognizing a chart, stems/branches and Ten Gods, timelines, full analysis, and the seven-step reading workflow. Each lesson takes three to five minutes and progress is stored locally. The standalone [`/learn`](http://localhost:3000/learn) library contains **28 structured guides** (11 Agent, 17 Bazi), 27 core agent terms, and a 137-entry Bazi cross-reference. Their different purposes, curriculum, and reading path are explained in [section 4](#4--learning-library).

**Bazi chart calculation (practitioner-oriented conventions)** — Apparent solar time (longitude correction plus equation of time), luck-cycle starts calculated down to **years, months, and days**, selectable late-zi-hour conventions, major/minor/annual luck cycles, shen sha, life palace, body palace, and fetal origin; stems and branches are color-coded by the Five Elements. See [`docs/bazi-guide.md`](docs/bazi-guide.md) for methods and conventions.

**Bazi rule engine (137 entries + full analysis)** — Every chart element can be clicked for an explanation and cross-links. **Chart overview** gives an eight-part analysis: day master/month command, strength score, Five-Element balance, favorable directions, Ten-God tendencies and personality cues, current major and annual luck, and palaces. It is calculated from lookup tables and generating/controlling rules, not by the model. Every card can send a contextual question to the mentors or search the library.

**Library intake** — Upload PDF, Markdown, or TXT files. They are split and indexed by page or section, then classified by intellectual tradition. Scanned PDFs are clearly marked as unsupported instead of silently pretending to succeed.

## 3 · Quick start

Node.js 22 LTS is required.

```bash
npm ci
npm run dev                   # http://localhost:3000
```

Open Settings from the lower-right control, configure and save a chat provider, then use a second terminal:

```bash
npm run doctor                # Reads the same settings; checks keys and local-index state
npm run seed:all              # Loads 9 philosophy books + 18 Bazi guides (27 volumes total)
```

> **Run `npm run seed:all`** — without indexed sources, the three mentors will keep returning “insufficient material.”
> `seed:all` = `seed:sample` (philosophy collection) + `seed:docs` (Bazi materials); they may be run separately.

Most features work without an API key: chart calculation, Bazi explanations, and learning mode. Use **View example reply** to preview a conversation. `USE_MOCK_EMBEDDING=1` also lets you verify upload and retrieval flows.

For chat, supply **Base URL, API key, and model name** in Settings. **Test connection** can load models automatically from providers that support `/models`; otherwise enter the model name manually. Saved settings live in the local server's `data/provider-settings.json` (mode `0600`, Git-ignored, and never returned to the browser). The web app, Next.js APIs, and `doctor`, `seed`, and `reindex` CLIs use the same file. `.env.local` is also supported, but complete server settings take precedence.

### Environment variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `CHAT_BASE_URL` | Anthropic `/messages`-compatible endpoint | `https://api.minimaxi.com/anthropic` |
| `CHAT_API_KEY` | Chat-model key | `sk-…` |
| `CHAT_MODEL` | Model name; requires native tool use and can be probed with `npm run probe:tools` | `MiniMax-M3` |
| `OPENAI_COMPAT_BASE_URL` | OpenAI `/embeddings`-compatible endpoint | `https://api.openai.com/v1` |
| `OPENAI_COMPAT_API_KEY` | Embedding key | `sk-…` |
| `OPENAI_COMPAT_EMBEDDING_MODEL` | Embedding model | `text-embedding-3-large` |
| `USE_MOCK_EMBEDDING` | `1` = local lexical mock; validate without a key and rebuild after changing to a real model | `1` |
| `DATA_DIR` / `VECTOR_BACKEND` | Data directory / vector backend | `./data` / `local` |

Chat and embeddings use separate keys. `CHAT_API_KEY` creates answers; `OPENAI_COMPAT_API_KEY` turns questions and books into vectors. If you do not have the second key, keep `USE_MOCK_EMBEDDING=1`. When a real embedding key is available, add it to `.env.local`, change the flag to `0`, then run `npm run reindex:embeddings`. The command builds a complete replacement index before it swaps the old one.

### Suggested flow

1. Create a **Seeker profile** (birth details → automatic chart), click any chart item to learn it, and open **Chart overview** for the full analysis.
2. **Add books to the library**: upload sources or notes, select intellectual-tradition tags, and wait for indexing.
3. Put your concern **on the tea table**, read the mentors' replies, and open **Sources** to verify the text.
4. Select mentors through the header portraits. For Bazi or luck-cycle questions, keep only **Old Hu** if appropriate; retrieval, materials, and validation narrow accordingly.
5. An explanation card's **Ask the mentors** action sends its chart context into the dialogue.
6. **Trace** mode is the default agent tool loop. Expand the execution-trace panel below an answer; switch it off to compare with fixed RAG.
7. Enter the in-page **Learn** mode from the lower-right control, or use [`/learn`](http://localhost:3000/learn) to continue through either learning path or the Bazi reference.

## 4 · Learning library

The learning library is the project's structured self-study entrance. Rather than placing Markdown files in a flat directory, it organizes material around three specific tasks. At [`http://localhost:3000/learn`](http://localhost:3000/learn), only the current task is shown at one time, and switching tasks does not leave the page.

<img width="2404" height="1354" alt="Learning library" src="https://github.com/user-attachments/assets/f7eb195e-b91f-42ec-a014-7a2ae626b61d" />

### Three learning entry points

| Entry point | Scale | Questions it answers | Outcome |
| --- | --- | --- | --- |
| **Agent path** | 11 guides / 5 stages | How does RAG ingest and retrieve? Why does an agent call a particular tool? How do citations, stopping, and evaluation become code? | Find the first failure from a trace and turn it into a regression evaluation |
| **Bazi path** | 17 guides / 6 stages | What are the Four Pillars, stems, branches, hidden stems, Ten Gods, strength, luck-cycle start, and annual luck? | Explain a chart using the seven-step workflow and distinguish tradition, project algorithm, and unimplemented boundaries |
| **Bazi quick reference** | 137 entries / 7 categories | Look up a character, Ten God, or palace and follow related concepts | Search, filter, read, and follow cross-links within one explanation system |

The three-part control at the top changes tasks. The curriculum view places stages on the left and ordered guides on the right. Each path gives a learning goal and a **Start at lesson 01** entry; lesson rows show order, level, synopsis, and direct Bazi-reference links. The **Learning-library tour** in the header takes about two minutes through task selection, stage navigation, continuous reading, the term list, and the Bazi quick reference, switching views to show the real interface.

### Agent path: from concepts to an evaluable system

| Stage | Guides | Focus |
| --- | --- | --- |
| 01 · Map the territory | RAG concepts; Agent basics | Core coordinates for embeddings, chunks, topK, tools, planning, memory, and reflection |
| 02 · Deconstruct the system | System architecture; technology stack | How a request passes through the UI, ingestion, vector retrieval, the agent loop, and three-mentor generation |
| 03 · Build a trust chain | RAG code walkthrough; citation validation | Source anchoring, scoped retrieval, whole-set invalidation, targeted retry, and voice validation |
| 04 · Let the model act | Tool-loop design (M0–M5); target agent blueprint | Tool registry, evidence ledger, stopping conditions, and places for planning/memory/evals |
| 05 · Debug and evaluate | Trace-debugging guide; verification plan; M5 live-service acceptance | Find the root cause from a trace and turn failure cases into repeatable checks |

The end of the path includes a collapsed list of **27 core Agent terms**. Each entry explains the concept and points to its implementation path in the repository, helping readers align terminology before reading source code.

### Bazi path: from reading a chart to independent analysis

| Stage | Guides | Focus |
| --- | --- | --- |
| 01 · Recognize the chart | Chart anatomy; stems, branches, and hidden stems | Explain each chart field; use the analogy “stems = frontend, branches = server, hidden stems = internal processes” for visible, supporting, and internal layers |
| 02 · Understand relationships | Ten Gods and strength | Calculate Ten Gods from the day master, then make a transparent rough assessment through seasonal support, roots, and assistance |
| 03 · Add time | Luck-cycle start, major luck, and annual luck | Separate the natal chart, ten-year environment, and annual context instead of inferring events from two annual characters |
| 04 · Read independently | Seven-step chart-reading workflow | Time calibration → day master/month command → roots → Ten-God placement → strength/flow → temporal overlay → reality check |
| 05 · Check conventions | Chart operation and algorithm conventions; how Bazi enters the three mentors | Apparent solar time, late-zi-hour convention, palaces, shen sha, and three-level material isolation for Hu/Xuan/Li |

All examples use fictional charts and do not describe real people. Guides separate **traditional definitions**, **software analogies**, **the project's deterministic algorithms**, and **unimplemented boundaries** so that metaphors are not mistaken for Bazi rules.

### Bazi quick reference

The quick reference uses [`src/core/mingli/mingliKb.ts`](src/core/mingli/mingliKb.ts) as its single source of truth and shares the same 137 entries as the click-to-explain chart UI, preventing the course and chart explanations from drifting apart.

- Search terms, summaries, and full explanations, for example “hidden stems,” “Jia,” “Direct Officer,” or “major luck.”
- Filter by basic concept, Ten Heavenly Stems, Twelve Earthly Branches, Ten Gods, Five Elements, Four-Pillar palaces, or shen sha.
- Desktop uses a list/detail master-detail layout; mobile shows the current explanation before results.
- Every entry lists related concepts, so you can continue from “hidden stems” to “Earthly Branches,” “rooting,” or “month command.”
- Every entry has a stable deep link; for example, [`/learn#mingli-canggan`](http://localhost:3000/learn#mingli-canggan) opens the reference and locates hidden stems.

### How the two learning modes work together

| Learning mode | Entry | How to use it |
| --- | --- | --- |
| In-page guided lessons | **Learn** in the lower-right corner | Follow highlights through the live interface in 3–5 minutes; 6 Agent lessons and 5 Bazi lessons, with browser-local progress |
| Structured guides | `/learn` library | Read the Markdown guides continuously by stage; document pages include breadcrumbs, course progress, related terms, and previous/next navigation |
| Immediate explanation | Chart cards or Bazi quick reference | Click a field on your own chart or use the 137 entries for search and cross-checking |
| Running observation | Header **Trace** switch | Bring a lesson concept into a real answer and inspect retrieval, tool calls, evidence ledger, stopping reason, and validation result |

The shortest recommended path is: finish the relevant in-page guided lessons to form an overall impression; continue from guide 01 in the learning library; use the quick reference whenever a Bazi concept appears; and, when learning Agent engineering, turn on **Trace** to connect every mechanism in the guide to a real execution.

## 5 · Bazi conventions at a glance

| Item | Convention | Basis |
| --- | --- | --- |
| Calendar stems and branches | `lunar-javascript` | Widely used calendar library |
| Apparent solar time | Longitude correction + equation of time (EOT), with day-pillar adjustment across midnight | `src/core/user/solarTime.ts` |
| Late zi hour | Same day by default (mainstream Zi Ping); can switch to next day | `lateZiRule` |
| Luck-cycle start | Precise years/months/days; default three days = one year conversion, with exact option | `qiYunConvention` |
| Annual luck | Li Chun as the boundary | `src/core/mingli/liuNian.ts` |
| Strength/favorable elements/Ten-God tendency | Deterministic tables and scoring, with limitations documented in the cards | `src/core/mingli/explainChart.ts` |
| Chart distribution | Hu receives full detail; Xuan receives qi dynamics; Li is fully isolated | `src/core/mingli/chartBrief.ts` |

See [`docs/bazi-guide.md`](docs/bazi-guide.md) for the complete explanation.

## 6 · Product boundaries

This project does not perform fear-based fortune telling or deterministic predictions. Bazi material is cultural interpretation and a reference for self-observation, not medical, legal, or investment advice. Models must not calculate stems, branches, or dates themselves. The system says **not yet in the library** when no source evidence exists and never makes a person's final life decision. Birth details and private books stay on the local machine by default.

## 7 · Technology stack and architecture

Next.js 15 + React 19 + TypeScript full stack; local JSON metadata and vector indexes; `pdfjs-dist` page extraction; a custom Bazi rule engine; Anthropic-compatible chat plus OpenAI-compatible embeddings; Vitest and Zod; optional Supabase cloud snapshots. For why these choices were made — and why LangChain, LightRAG, and GraphRAG were not used — see [`docs/tech-stack.md`](docs/tech-stack.md).

<img src="docs/assets/architecture.svg" alt="Architecture: ingestion, default agent evidence gathering, fixed RAG comparison, deterministic Bazi engine, and local storage" width="100%" />

The four lanes represent four mechanisms: **ingestion** turns books into vector memory with source coordinates; **default agent evidence gathering** lets a coordinator decide the next step under controls, an evidence ledger, six stopping conditions, and a visible trace; **fixed RAG** is a stable comparison path closed by double validation and targeted retry; the **Bazi engine** calculates deterministically, then injects three material tiers.

### Documentation map

| Topic | Documents |
| --- | --- |
| Current architecture and data flow | [`docs/architecture.md`](docs/architecture.md) |
| Target agent blueprint / tool-loop design | [`docs/agent-blueprint.md`](docs/agent-blueprint.md) · [`docs/agent-loop-design.md`](docs/agent-loop-design.md) |
| Mentor library separation × Bazi injection | [`docs/mentor-libraries-and-bazi-design.md`](docs/mentor-libraries-and-bazi-design.md) |
| Chart usage | [`docs/bazi-guide.md`](docs/bazi-guide.md) |
| Visual language (new Chinese style) | [`docs/design-language.md`](docs/design-language.md) |
| Learning mode v2 (two paths) | [`docs/learning-mode-design.md`](docs/learning-mode-design.md) |
| RAG / Agent beginner walkthroughs | [`docs/rag-concepts-primer.md`](docs/rag-concepts-primer.md) · [`docs/rag-beginner-walkthrough.md`](docs/rag-beginner-walkthrough.md) · [`docs/agent-beginner-walkthrough.md`](docs/agent-beginner-walkthrough.md) |
| Agent trace debugging | [`docs/agent-trace-debugging.md`](docs/agent-trace-debugging.md) |
| Bazi curriculum | [`docs/bazi-chart-anatomy.md`](docs/bazi-chart-anatomy.md) · [`docs/bazi-stems-branches.md`](docs/bazi-stems-branches.md) · [`docs/bazi-ten-gods-strength.md`](docs/bazi-ten-gods-strength.md) · [`docs/bazi-luck-cycles.md`](docs/bazi-luck-cycles.md) · [`docs/bazi-reading-workflow.md`](docs/bazi-reading-workflow.md) |
| Citation-validation design | [`docs/rag-citation-design.md`](docs/rag-citation-design.md) |
| Roadmap / verification plan | [`docs/roadmap.md`](docs/roadmap.md) · [`docs/verification-plan.md`](docs/verification-plan.md) · [`docs/m5-acceptance.md`](docs/m5-acceptance.md) |
| Mentor voice examples / avatars | [`docs/tavern-demo.md`](docs/tavern-demo.md) · [`docs/avatar-guide.md`](docs/avatar-guide.md) · [`docs/avatar-prompts.md`](docs/avatar-prompts.md) |
| Supabase sync | [`docs/supabase-setup.md`](docs/supabase-setup.md) |

## 8 · Engineering commands

```bash
npm run typecheck            # Type checking
npm run lint                 # Code style
npm test                     # Full Vitest suite
npm run doctor               # Read-only chat/embedding/Supabase and local-index inspection
npm run seed:all             # Load all sources: 9 philosophy books + 18 Bazi guides = 27 volumes, 266 chunks
npm run seed:sample          # Load only 9 philosophy books
npm run seed:docs            # Load only 18 Bazi guides
npm run probe:tools          # Probe native tool-use support of the chat model
npm run acceptance           # M5 acceptance: five live-service scenarios and deterministic invariants
npm run reindex:embeddings   # Safely rebuild after changing the real embedding model
npm run build                # Production build
npm run sync:supabase        # Optional one-way local-snapshot upload
```

## 9 · Project status

**Completed**: minimal Agent tool loop (M0–M3), **execution-trace panel (M4)** and Trace switch, trusted RAG chain (scoped retrieval, double validation, targeted retry, learning-mode pipeline annotations), **M5 acceptance script** (`npm run acceptance`), learning center (six Agent lessons and six Bazi stages/seventeen lessons) plus `/learn` library (28 structured guides, 27 Agent terms, 137 Bazi reference entries), a complete Bazi chart and rule engine, strengthened mentor personas, and new-Chinese-style visual language v5.

**Completed**: M5 automatic and manual acceptance (26 hard checks and 2 manual content checks passed). Agent is the default mode; turning off Trace explicitly uses fixed RAG.

**In progress**: session summaries, long-term memory, and streaming answers. A real embedding key is not configured, so the project currently uses Mock; when available, `npm run reindex:embeddings` can rebuild safely.

**Partly complete**: local session-persistence foundations (session API; on-disk messages, citations, and traces; frontend restore and switching).

**Not started**: BM25 hybrid retrieval, OCR/EPUB ingestion, systematic evaluation, and multi-user deployment (Auth/RLS/rate limits). See [`docs/roadmap.md`](docs/roadmap.md).

## 10 · Data and privacy

```text
data/
  app.json      Document and chunk metadata (Git-ignored)
  documents/    Original files you upload (Git-ignored)
  indexes/      Local vector indexes (Git-ignored)
  samples/      Public demonstration material
```

Everything is local by default. `npm run sync:supabase` is an explicit, one-way cloud snapshot. **Do not** expose the current local API directly to the public internet: authentication and rate limiting are not yet implemented.

## 11 · Contributing and contact

This is a personal learning project and Issues are welcome for discussion. Before sending a pull request, read [`CONTRIBUTING.md`](CONTRIBUTING.md), `docs/roadmap.md`, and the relevant design documents, then preserve the principles of local-first, deterministic-first, and learning-first.

- Author: **kiko**
- Email: <chikongmuzhi@gmail.com>
- License: [MIT](LICENSE). Books uploaded to the library remain the property of their copyright holders. They are local and Git-ignored by default; **do not** commit copyrighted books to this repository.
- Community code of conduct: [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) · Security reports: [`SECURITY.md`](SECURITY.md)

## 12 · Acknowledgements

Learn AI, join L! Thanks to the [Linux.do](https://linux.do/latest) community for its support.

<div align="center"><sub>Tea instead of wine · questions instead of divination</sub></div>
