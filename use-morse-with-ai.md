> Source: https://docs.morsecms.xyz/use-morse-with-ai.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Use Morse with AI

> Morse publishes its documentation in machine-readable formats and ships agent-operable tooling, so AI coding agents can learn the protocol from current context, and then run the entire backend themselves.

## Machine-readable docs

Every page on this site is available in three agent-friendly forms. No scraping, no HTML parsing, just Markdown.

| Format | URL | Use it for |
| --- | --- | --- |
| **llms.txt** | [`/llms.txt`](https://docs.morsecms.xyz/llms.txt) | Compact index of all pages with one-line descriptions. Point an agent here first so it can pick which pages to read. |
| **llms-full.txt** | [`/llms-full.txt`](https://docs.morsecms.xyz/llms-full.txt) | The complete documentation concatenated into a single Markdown file. One fetch gives an agent everything. |
| **Markdown twins** | `/<page>.md` | Every page has a Markdown version at the same URL with `.md` instead of `.html` (e.g. [`/entries.md`](https://docs.morsecms.xyz/entries.md)). |

## Prime a coding agent

Paste one line into your agent to load the full Morse context:

```prompt
Read https://docs.morsecms.xyz/llms-full.txt — the full documentation for Morse,
the decentralized headless CMS protocol on Sui + Walrus. Use it to help me build
with the Morse CLI, TypeScript SDK, or Move contracts.
```

Or fetch context on demand from a terminal-capable agent:

```bash
# Index of all pages
curl -s https://docs.morsecms.xyz/llms.txt

# One specific page as Markdown
curl -s https://docs.morsecms.xyz/quick-start-cli.md

# Everything at once
curl -s https://docs.morsecms.xyz/llms-full.txt
```

> **TIP: Working in a Morse project?**
>
> Add the prime-your-agent prompt to your project's `CLAUDE.md`, `AGENTS.md`, or Cursor rules so every session starts with accurate Morse context instead of guesses.

## Copy any page for AI

Each docs page has a **Copy page** button (top right of the content area) with four actions:

- **Copy page as Markdown**: puts the page's Markdown twin on your clipboard, ready to paste into any assistant.
- **View as Markdown**: opens the raw `.md` version in a new tab.
- **Open in ChatGPT / Open in Claude**: opens the assistant with a prompt that references this page and the full docs.

There is also **Ask AI** in the header (or press `⌘I`): type a question and it opens Claude or ChatGPT pre-loaded with the entire Morse documentation as context.

## Agent-first by design

Morse is not just documented for agents; it is *operable* by them. There is no dashboard signup, no API-key console, no human-only provisioning step anywhere in the protocol. Everything is a CLI command, an SDK call, or a transaction:

- **Provision from the terminal**: with `morse publication create`, `morse collection create` and `morse entry add`, a coding agent can go from nothing to published content without leaving the shell. See the [CLI quick start](https://docs.morsecms.xyz/quick-start-cli.html).
- **Script it with the SDK**: `@arcadiasystems/morse-sdk` exposes the same operations as typed TypeScript with structured errors, ideal for agent-authored automation. See the [SDK quick start](https://docs.morsecms.xyz/quick-start-sdk.html).
- **Verify on-chain**: every mutation returns a transaction digest an agent can check. State is queryable from the contracts directly; no opaque backend to trust. See [Smart Contracts](https://docs.morsecms.xyz/contracts-overview.html).
- **Deterministic auth**: capability objects (`OwnerCap`, `PublisherCap`) make permissions explicit and inspectable, so an agent always knows what it is allowed to do. See [Access Control](https://docs.morsecms.xyz/access-control.html).

```bash
# A complete agent-driven publishing flow
npm install -g @arcadiasystems/morse-cli

export MORSE_PRIVATE_KEY=suiprivkey1...      # a funded testnet key for the agent
export MORSE_NETWORK=testnet
morse publication create --name "Agent Blog" --slug "agent-blog-$(date +%s)"   # canonical on-chain identity
morse collection create posts                # content container
echo '{"title":"Hello","body":"Sent by an agent."}' > post.json
morse entry add hello --file ./post.json     # payload to Walrus, proof on Sui
morse entry get 0                            # read the record back
```

## Feedback loop

If these docs are stale, missing, or confusing (for you or your agent), use the **Was this helpful?** control at the bottom of any page, or open an issue directly:

- [File docs feedback](https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback): include the page URL and what was wrong.
- [Suggest changes](https://github.com/arcadiasystems/morse-dcms): every page footer links to its source for direct edits.
