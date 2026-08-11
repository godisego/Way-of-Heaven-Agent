<div align="center">

English · [简体中文](README.zh-CN.md)

# Way of Heaven Agent

</div>

**An open-source learning lab for AI agents: hand-written RAG, a minimal tool loop, traceable citations, and a Chinese-classics learning experience.**

Way of Heaven Agent is primarily a learning project. It explores how retrieval, evidence tracking, citation validation, deterministic domain logic, and agent tool use can be built clearly enough to inspect and teach. The product is presented as a three-mentor tea house: a Bazi practitioner, an existentialist mentor, and a Taoist host.

## What is included

- A local-first Next.js application with TypeScript, React, Vitest, and optional Supabase sync.
- A hand-written RAG pipeline for uploaded PDF, Markdown, and TXT sources.
- A controlled agent loop with search, source reading, stopping conditions, evidence tracking, and trace inspection.
- Deterministic Bazi calculation and explanations; the model interprets results but does not calculate the chart.
- A learning center covering agent engineering and Bazi concepts.

## Quick start

Requirements: Node.js 22 LTS.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`, configure a chat provider in Settings, and optionally run `npm run seed:all` to load the sample library. See the [Chinese README](README.zh-CN.md) for the complete setup and architecture guide.

## Principles and boundaries

The project is local-first, deterministic where correctness matters, and learning-first. Bazi content is cultural interpretation and self-reflection material, not medical, legal, financial, or guaranteed predictive advice. Do not upload or redistribute copyrighted books without permission.

## Contributing and community

Please read [CONTRIBUTING.md](CONTRIBUTING.md), follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and report security issues according to [SECURITY.md](SECURITY.md). Issues, documentation improvements, tests, and small focused pull requests are welcome.

Licensed under the [MIT License](LICENSE).
