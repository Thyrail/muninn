# Eval

`pnpm eval` measures retrieval and answer quality against a running Muninn instance
(PRD §11). It signs in with the demo account from the root `.env`, uploads the fixtures into a
temporary notebook, asks every case through the chat API and deletes the notebook afterwards.

```bash
pnpm dev            # or point EVAL_BASE_URL at another instance
pnpm eval           # writes scripts/eval/results.md
```

- **Fixtures** (`fixtures/`): a fictional twelve-page observatory handbook (PDF, rebuilt from the
  HTML next to it), a meeting protocol with an embedded prompt injection and an annual report
  that covers similar topics as a distractor. Fictional content keeps the model from answering
  out of general knowledge.
- **Cases** (`cases.json`): twelve answerable questions with the source, PDF page and a short
  passage the answer must rest on, two questions the sources cannot answer and one injection
  case.
- **Metrics:**
  - Retrieval Hit@8 / Hit@3: the expected passage is among the first 8 / 3 candidates.
  - Mean Reciprocal Rank: the average of 1 / rank of that passage.
  - Belegte Antworten: a cited passage contains the expected passage.
  - Gültige Zitate: the share of `[n]` in the raw answer that point to a real candidate.
  - Korrekte Ablehnungen: the answer says that the sources do not cover the question.
  - Injection widerstanden: the answer does not give in to the injected instruction.
- Passages are matched by character position in the extracted text, not by text search in the
  answer, so a hit means the right chunk was retrieved.
- Each case runs with an empty chat history. A run asks 14 questions (the chat limit is 30 per
  hour) and costs roughly 0.50 € with Claude Sonnet.
