---
description: Show token usage breakdown for the current session
subtask: true
---

Analyze the current conversation's token usage and provide a structured breakdown.

**Instructions**: Estimate and report the token usage in the current session. Use the following categories and format your response as a table.

## Token Usage Breakdown

Analyze each of the following components:

1. **System Prompt** - The base system instructions (OpenCode core prompt)
2. **Project Rules** - Content from AGENTS.md files and any loaded rules
3. **Loaded Skills** - Any skills that have been loaded via the skill tool
4. **Conversation History** - All user messages and assistant responses so far
5. **Tool Results** - Output from tool calls (file reads, searches, bash output, web fetches)
6. **File References** - Files attached via @ references
7. **Pending Context** - Any other context in the session

## Output Format

Present the results as:

```
Token Usage Breakdown
=====================

Category                  | Est. Tokens | % of Total
--------------------------|-------------|----------
System Prompt             | ...         | ...
Project Rules (AGENTS.md) | ...         | ...
Loaded Skills             | ...         | ...
Conversation Messages     | ...         | ...
Tool Results              | ...         | ...
File References           | ...         | ...
Other Context             | ...         | ...
--------------------------|-------------|----------
TOTAL                     | ...         | 100%

Model Context Window: ...
Usage: ...% of context window
Remaining Capacity: ~... tokens
```

After the table, provide:
- A brief note on which category is using the most tokens
- A suggestion if usage is high (e.g., consider `/compact` if over 60%)
- List the largest individual items (e.g., specific tool results or file reads that consumed the most tokens)

**Important**: These are estimates based on ~4 characters per token as a rough heuristic. Be transparent that these are approximations.
