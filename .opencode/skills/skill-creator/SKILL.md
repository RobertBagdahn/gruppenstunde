---
name: skill-creator
description: Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy.
license: MIT
metadata:
  author: anthropics/skills
  version: "1.0"
---

# Skill Creator

A skill for creating new skills and iteratively improving them.

At a high level, the process of creating a skill goes like this:

- Decide what you want the skill to do and roughly how it should do it
- Write a draft of the skill
- (Optional) Create a few test prompts and run claude-with-access-to-the-skill on them
- Help the user evaluate the results both qualitatively and quantitatively
- Rewrite the skill based on feedback
- Repeat until you're satisfied

Your job when using this skill is to figure out where the user is in this process and then jump in and help them progress. Be flexible: if the user says "just vibe with me, no evals", do that instead.

## Communicating with the user

Pay attention to context cues to understand how to phrase your communication. Briefly explain jargon ("evaluation", "assertion", "JSON") if you're unsure the user knows it.

---

## Creating a skill

### Capture Intent

Start by understanding the user's intent. The current conversation might already contain a workflow the user wants to capture. Extract answers from history first — tools used, sequence of steps, corrections, input/output formats. Confirm before proceeding.

1. What should this skill enable the agent to do?
2. When should this skill trigger? (what user phrases/contexts)
3. What's the expected output format?
4. Should we set up test cases? Skills with objectively verifiable outputs (file transforms, data extraction, code generation, fixed workflow steps) benefit from test cases. Subjective skills (writing style, art) often don't. Suggest a default, let the user decide.

### Interview and Research

Proactively ask about edge cases, input/output formats, example files, success criteria, dependencies. Research relevant docs/best practices in parallel via subagents if available. Come prepared to reduce burden on the user.

### Write the SKILL.md

- **name**: Skill identifier (kebab-case, matches directory).
- **description**: The primary triggering mechanism. Include both WHAT the skill does AND specific WHEN-to-use contexts. Agents tend to *undertrigger*, so make descriptions a little "pushy" — e.g. "Use this skill whenever the user mentions dashboards, data visualization, internal metrics, or wants to display any kind of company data, even if they don't explicitly ask for a 'dashboard.'"
- **compatibility**: Required tools/dependencies (optional, rarely needed).
- the rest of the skill.

### Skill Writing Guide

#### Anatomy of a Skill

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic/repetitive tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Files used in output (templates, icons, fonts)
```

#### Progressive Disclosure

Three-level loading system:
1. **Metadata** (name + description) — always in context (~100 words)
2. **SKILL.md body** — in context whenever the skill triggers (<500 lines ideal)
3. **Bundled resources** — as needed (unlimited; scripts can execute without loading)

Key patterns:
- Keep SKILL.md under ~500 lines; if approaching the limit, add hierarchy with clear pointers to follow-up files.
- Reference files clearly from SKILL.md, with guidance on when to read them.
- For large reference files (>300 lines), include a table of contents.
- **Domain organization**: when a skill supports multiple variants, organize by variant in `references/` and have the agent read only the relevant file.

#### Principle of Lack of Surprise

Skills must not contain malware, exploit code, or anything that could compromise security. A skill's contents should not surprise the user given its description. Don't create misleading skills or ones designed to facilitate unauthorized access or data exfiltration.

#### Writing Patterns

Prefer the imperative form in instructions.

**Defining output formats:**
```markdown
## Report structure
ALWAYS use this exact template:
# [Title]
## Executive summary
## Key findings
## Recommendations
```

**Examples pattern:**
```markdown
## Commit message format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

### Writing Style

Explain *why* things are important rather than relying on heavy-handed MUSTs. Today's models are smart and have good theory of mind — given a good harness they go beyond rote instructions. If you find yourself writing ALWAYS/NEVER in all caps or rigid structures, that's a yellow flag — reframe and explain the reasoning. Write a draft, then look at it with fresh eyes and improve it.

### Test Cases (optional)

After a draft, come up with 2-3 realistic test prompts a real user would say. Share them with the user, then run them. Save to `evals/evals.json` (see `references/schemas.md` for the full schema).

---

## Running and evaluating test cases

This applies when the user wants rigorous evaluation. Skip it if they just want to vibe.

Put results in `<skill-name>-workspace/` as a sibling to the skill directory, organized by iteration (`iteration-1/`) and test case (`eval-0/`).

1. **Spawn runs** — for each test case, spawn two subagents in the same turn: one with the skill, one baseline (no skill for new skills; the old version snapshot for improvements).
2. **Draft assertions** while runs are in progress. Good assertions are objectively verifiable with descriptive names. Don't force assertions on subjective skills.
3. **Capture timing** from each task notification (`total_tokens`, `duration_ms`) into `timing.json` immediately — it isn't persisted elsewhere.
4. **Grade, aggregate, review** — grade each run into `grading.json` (fields: `text`, `passed`, `evidence`), aggregate into `benchmark.json`, surface patterns (non-discriminating assertions, high-variance evals, time/token tradeoffs), and present results to the user.
5. **Read feedback**, improve the skill, rerun. Repeat until the user is happy, feedback is empty, or you stop making progress.

See `references/schemas.md` for exact JSON structures.

---

## Improving the skill

This is the heart of the loop.

1. **Generalize from feedback.** Skills get used across many prompts. Don't overfit to the few test examples or pile on constrictive MUSTs. If an issue is stubborn, try different metaphors or working patterns.
2. **Keep the prompt lean.** Remove things that aren't pulling their weight. Read transcripts, not just outputs — cut parts that make the model waste time.
3. **Explain the why.** Even terse/frustrated feedback usually has a real reason. Understand the task and transmit that understanding into the instructions.
4. **Look for repeated work.** If every test run independently writes a similar helper script, bundle that script in `scripts/` and have the skill use it.

Take your time and mull things over. Draft a revision, then look at it anew and improve.

---

## Description Optimization

The description field is the primary mechanism determining whether the skill is invoked. After creating/improving a skill, offer to optimize the description for triggering accuracy.

- Generate ~20 realistic trigger eval queries (8-10 should-trigger, 8-10 should-not-trigger). Make them concrete and detailed (file paths, names, casual speech, typos). The most valuable should-not-trigger queries are near-misses that share keywords but need something different.
- How triggering works: skills appear in the agent's `available_skills` list with name + description. The agent consults a skill only for tasks it can't easily handle on its own. Simple one-step queries may not trigger a skill even with a perfect description. So make eval queries substantive enough that consulting a skill is genuinely beneficial.
- Update the SKILL.md frontmatter with the best description and show the user before/after.

---

## Reference files

- `references/schemas.md` — JSON structures for evals.json, grading.json, benchmark.json, etc.

---

Core loop, repeated for emphasis:
- Figure out what the skill is about
- Draft or edit the skill
- (Optional) Run with-skill on test prompts, evaluate with the user
- Repeat until satisfied
