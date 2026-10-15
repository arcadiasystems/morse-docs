> Source: https://docs.morsecms.xyz/agent-publishes.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Let an AI agent publish

> No signup, no API console. A wallet, a cap, the docs in llms.txt, and an agent can publish on its own while you keep the owner key.

- About 15 minutes
- CLI or SDK
- An agent runtime with a shell
- Testnet

## Why this works at all

Most CMSs need a human to click through signup, create an API key and paste it somewhere. Morse has no signup. An agent with a funded Sui wallet and a `PublisherCap` can publish on its own, every write returns a transaction digest, and you can revoke it in one command without touching the agent. That makes Morse a natural output channel for an agent that writes: a changelog bot, a research digest, a status page, a newsletter drafted overnight.

## Give the agent its own wallet and cap

Treat the agent like a contractor, not like yourself. Fresh wallet, small balance, its own cap.

```bash
$ morse cap issue 0xAGENT_WALLET_ADDRESS
$ morse --json publication get | jq -r .id
```

Fund the agent wallet from the faucet and swap a little WAL, as in [Launch a blog](https://docs.morsecms.xyz/launch-a-blog.html). Keep the owner key on your machine only.

## Give the agent the docs

The docs ship in agent-readable form. Put this in the project's `CLAUDE.md`, `AGENTS.md` or Cursor rules so every session starts with Morse context:

```markdown
# Morse
This project publishes to a Morse publication on Sui testnet.
Before using the Morse CLI or SDK, read https://docs.morsecms.xyz/llms-full.txt
(or https://docs.morsecms.xyz/llms.txt for the index and fetch pages as .md).

Rules
- Use the CLI non-interactively: `morse --json -q --yes ...`
- Never run `account export`, never print MORSE_PRIVATE_KEY.
- New post: `morse entry add <name> --file <path> --epochs 30`
- Edit an existing post: `morse revision publish-direct <entryId> --file <path> --epochs 30`
- Look up entry ids in morse-map.json; update it after every add.
- Read back with `--via-aggregator` on testnet.
```

## Give the agent a job

Environment for the agent's shell, same four variables as [Publish from CI](https://docs.morsecms.xyz/publish-from-ci.html):

```bash
export MORSE_PRIVATE_KEY=suiprivkey1...      # the agent wallet, not yours
export MORSE_NETWORK=testnet
export MORSE_PUBLICATION=0x69d4...f327
export MORSE_COLLECTION=posts
```

Then a prompt that describes the outcome, not the commands. The agent has the docs.

```text
Every Friday, summarise the week's merged pull requests in this repo as a short
Markdown post under content/posts/YYYY-MM-DD-weekly.md, then publish it to Morse
as a new entry. Print the entry id and the Sui transaction digest when done.
```

## What the agent runs

Under the hood the agent ends up running something like this, which you can also run yourself to check the setup:

```bash
$ morse --json -q --yes status
$ morse --json -q --yes entry add 2026-10-17-weekly --file content/posts/2026-10-17-weekly.md --epochs 30
$ morse --json -q entry get 7
```

For an agent built on the SDK rather than shelling out, the equivalent is `addEntryFromBytes` with a `KeypairAdapter` from the agent's key; the [SDK reference cookbooks](https://docs.morsecms.xyz/sdk-workflows.html) have the exact call.

> **INFO: Why --json --yes -q**
>
> The agent should never sit at a prompt. `--yes` removes confirmations, `-q` removes progress output, `--json` gives it something to parse instead of guess.

## Watch, audit, revoke

Every write the agent makes is a transaction signed by its wallet, so the audit log is Sui itself:

```bash
$ morse entry list                               # what exists now
$ morse cap list 0xAGENT_WALLET_ADDRESS          # what it is allowed to do
$ morse cap revoke 0xAGENT_CAP_ID                 # and when you are done
```

Revocation takes effect on the next transaction. Nothing the agent already published disappears, and if it published something wrong, you append a revision (or delete the entry) from your own wallet.

| Do | Do not |
| --- | --- |
| Give the agent a wallet with days of budget, not months | Give it the owner key |
| Point it at `llms-full.txt` | Paste commands you have not tested into its prompt |
| Keep `morse-map.json` in the repo | Let it guess entry ids |
| Review the first few posts before you stop reviewing | Assume it read the docs |

## Next

- [Publish from CI](https://docs.morsecms.xyz/publish-from-ci.html): The same key model on a schedule.
- [Use Morse with AI](https://docs.morsecms.xyz/use-morse-with-ai.html): llms.txt, Markdown twins and the Ask AI shortcut.
- [Add a co-author](https://docs.morsecms.xyz/co-author.html): What a cap is and how to revoke it.
