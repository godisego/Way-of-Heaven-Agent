# Contributing · 贡献指南

感谢你愿意参与天道智能体。This project is a learning-oriented open-source project. Contributions that improve correctness, clarity, privacy, accessibility, and learning value are especially welcome.

## Before you start · 开始之前

- 请先阅读 `README.md`、`docs/roadmap.md` 和相关设计文档。
- For larger changes, open an Issue first so the scope and direction can be discussed.
- Do not commit API keys, personal birth data, uploaded books, generated indexes, or private documents.

## Workflow · 工作流程

```bash
git checkout -b feat/short-description
npm ci
npm run typecheck
npm run lint
npm test
```

提交 Pull Request 时，请说明：问题背景、改动内容、测试结果、是否涉及数据/隐私，以及对用户行为的影响。Keep pull requests focused and include screenshots or a short reproduction when the UI changes.

## Standards · 工程约定

- TypeScript strict mode; avoid `any` and unnecessary dependencies.
- Keep domain calculations deterministic and covered by tests.
- Preserve source coordinates and citation validation in retrieval changes.
- Follow the existing style and use clear English or bilingual names/comments where helpful.
- Commit messages should be concise and use prefixes such as `feat:`, `fix:`, `docs:`, `test:`, or `refactor:`.

## Review · 审核

Maintainers may request tests, documentation, a narrower scope, or clarification of cultural and safety boundaries. By contributing, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions are accepted under the repository's [MIT License](LICENSE).
