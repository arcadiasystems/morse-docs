> Source: https://morse-docs.vercel.app/use-morse-with-ai.html · Full docs: https://morse-docs.vercel.app/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/MandaWeb3/morse-docs/issues/new?labels=docs-feedback

# Use Morse with AI

> Morse publishes its documentation in machine-readable formats and ships agent-operable tooling, so AI coding agents can learn the protocol from current context — and then run the entire backend themselves.

## Machine-Readable Docs

Every page on this site is available in three agent-friendly forms. No scraping, no HTML parsing — just Markdown.

| Format | URL | Use it for |
| --- | --- | --- |
| **llms.txt** | [`/llms.txt`](https://morse-docs.vercel.app/llms.txt) | Compact index of all pages with one-line descriptions. Point an agent here first so it can pick which pages to read. |
| **llms-full.txt** | [`/llms-full.txt`](https://morse-docs.vercel.app/llms-full.txt) | The complete documentation concatenated into a single Markdown file. One fetch gives an agent everything. |
| **Markdown twins** | `/<page>.md` | Every page has a Markdown version at the same URL with `.md` instead of `.html` — e.g. [`/entries.md`](https://morse-docs.vercel.app/entries.md). |

## Prime a Coding Agent

Paste one line into your agent to load the full Morse context:

```prompt
Read https://morse-docs.vercel.app/llms-full.txt — the full documentation for Morse,
the decentralized headless CMS protocol on Sui + Walrus. Use it to help me build
with the Morse CLI, TypeScript SDK, or Move contracts.
```

Or fetch context on demand from a terminal-capable agent:

```bash
# Index of all pages
curl -s https://morse-docs.vercel.app/llms.txt

# One specific page as Markdown
curl -s https://morse-docs.vercel.app/quick-start-cli.md

# Everything at once
curl -s https://morse-docs.vercel.app/llms-full.txt
```

> **TIP: Working in a Morse project?**
>
> Add the prime-your-agent prompt to your project's `CLAUDE.md`, `AGENTS.md`, or Cursor rules so every session starts with accurate Morse context instead of guesses.

## Copy Any Page for AI

Each docs page has a **Copy page** button (top right of the content area) with four actions:

- **Copy page as Markdown** — puts the page's Markdown twin on your clipboard, ready to paste into any assistant.
- **View as Markdown** — opens the raw `.md` version in a new tab.
- **Open in ChatGPT / Open in Claude** — opens the assistant with a prompt that references this page and the full docs.

There is also **Ask AI** in the header (or press `⌘I`): type a question and it opens Claude or ChatGPT pre-loaded with the entire Morse documentation as context.

## Agent-First by Design

Morse isn't just documented for agents — it is *operable* by them. There is no dashboard signup, no API-key console, no human-only provisioning step anywhere in the protocol. Everything is a CLI command, an SDK call, or a transaction:

- **Provision from the terminal** — `morse init`, `morse publication create`, `morse entry add`: a coding agent can go from nothing to published content without leaving the shell. See the [CLI quick start](https://morse-docs.vercel.app/quick-start-cli.html).
- **Script it with the SDK** — `@arcadiasystems/morse-sdk` exposes the same operations as typed TypeScript with structured errors, ideal for agent-authored automation. See the [SDK quick start](https://morse-docs.vercel.app/quick-start-sdk.html).
- **Verify on-chain** — every mutation returns a transaction digest an agent can check. State is queryable from the contracts directly; no opaque backend to trust. See [Smart Contracts](https://morse-docs.vercel.app/contracts-overview.html).
- **Deterministic auth** — capability objects (`OwnerCap`, `PublisherCap`) make permissions explicit and inspectable, so an agent always knows what it is allowed to do. See [Access Control](https://morse-docs.vercel.app/access-control.html).

```bash
# A complete agent-driven publishing flow
npm install -g @arcadiasystems/morse-cli

morse init                                  # create + fund an identity (testnet)
morse publication create "agent-blog"       # canonical on-chain identity
morse collection create "posts"             # content container
echo '{"title":"Hello","body":"Sent by an agent."}' > post.json
morse entry add "hello" --file ./post.json  # payload to Walrus, proof on Sui
morse entry get "hello"                     # read it back, verified
```

## Feedback Loop

If these docs are stale, missing, or confusing — for you or your agent — use the **Was this helpful?** control at the bottom of any page, or open an issue directly:

- [File docs feedback](https://github.com/MandaWeb3/morse-docs/issues/new?labels=docs-feedback) — include the page URL and what was wrong.
- [Suggest changes](https://github.com/MandaWeb3/morse-docs) — every page footer links to its source for direct edits.
