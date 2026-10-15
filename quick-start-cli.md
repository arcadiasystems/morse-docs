> Source: https://docs.morsecms.xyz/quick-start-cli.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Quick Start: CLI

> Install morse-cli and go from zero to published content on testnet in under 5 minutes - no contracts, no code, just your terminal.

> **WARNING: Testnet status**
>
> Morse runs on **Sui testnet only** and the contracts are **unaudited**. Sui and Walrus testnets reset periodically (Walrus wipes every few months) - stored content and object IDs are lost on reset. Testnet SUI and WAL have no monetary value. Don't publish anything you can't afford to lose.

## Prerequisites

| Requirement | Details | Purpose |
| --- | --- | --- |
| Bun or Node | v1.2+ / >= 18 | JavaScript runtime |
| Sui wallet | Sui Wallet, Suiet, or any Sui-compatible wallet | Signing transactions on testnet |
| SUI + WAL tokens | [SUI faucet](https://faucet.sui.io/) / [Swap SUI for WAL](https://stake-wal.wal.app/?network=testnet) | Gas fees (SUI) and Walrus storage fees (WAL) |
| Bech32 private key | A `suiprivkey1...` string | CLI authentication - export from your wallet's settings |

## Installing

Install the CLI globally using your preferred package manager.

With npm:

```bash
npm i -g @arcadiasystems/morse-cli
```

Or with Bun / pnpm:

```bash
bun add -g @arcadiasystems/morse-cli
```

Verify the installation:

```bash
morse --help
```

## Creating a Profile

A profile stores your network, RPC endpoint, and active context. Create one for testnet:

```bash
morse config add testnet --network testnet
```

Verify your profile is active:

```bash
morse status
```

## Importing Your Key

Import a Sui private key into the encrypted keystore. The CLI prompts interactively for the key and a password - keys are never passed as flags.

```bash
morse account import
```

> **INFO: Key format**
>
> Paste a Bech32 `suiprivkey1...` string. Export one from your wallet's settings. For non-interactive environments (CI, scripts), set `MORSE_PRIVATE_KEY` instead - the CLI uses it directly and skips the keystore prompt entirely.

## Creating a Publication

This creates a publication with a globally unique slug and auto-selects it as the active context.

```bash
morse publication create --name "My Blog" --slug "my-blog-$(date +%s)"
```

> **INFO: Slugs are globally unique**
>
> Like usernames, a slug can only be registered once on the whole network - the timestamp suffix keeps this command collision-free for everyone following this guide. For a real project, pick any unused slug you like. If a slug is taken, the transaction aborts with `ESlugAlreadyExists`.

```output
Creating "My Blog"...
Created "My Blog" (0x23d2...)
  ownerCap:     0xa40a...
  publisherCap: 0x6141...
  tx:           7nF2n...
Selected as the active publication.
```

> **TIP: Which IDs to save**
>
> The CLI auto-selects new publications and collections as your active context, so you rarely need to paste IDs. If you do need them later, run `morse status` to see your active publication ID and collection.

## Creating a Collection

Collections group entries within a publication. The CLI auto-selects the new collection as your active context, so subsequent `entry` commands target it automatically. Run `morse status` at any point to see your active publication and collection.

```bash
morse collection create posts
```

```output
Creating collection "posts" (blob)...
Created collection "posts".
Selected as the active collection. (tx: DWkD...)
```

## Publishing an Entry

Create a content file and publish it. The CLI uploads the file to Walrus and registers the entry on-chain.

> **WARNING: This step needs WAL, not just SUI**
>
> Everything up to here only cost SUI gas - uploading to Walrus also spends WAL. Make sure your account holds both before running this (swap SUI for WAL at [stake-wal.wal.app](https://stake-wal.wal.app/?network=testnet)), or the upload fails with `Insufficient WAL balance`.

```bash
echo '{"title": "Hello World", "body": "My first post on Morse."}' > post.json
```

Publish it. The CLI targets the active publication and collection by default - these are set automatically when you create them. You can override with `-P <slug|id>` and `-C <name>` flags:

```bash
morse entry add hello --file post.json
```

```output
Uploading 65 bytes to Walrus...
✔ Added entry #0 "hello" (tx: D9Yfjk...)
  view: https://aggregator.walrus-testnet.walrus.space/v1/blobs/0iKeii...
```

## Reading It Back

Fetch the entry content by its ID. Entry IDs are monotonic - your first entry is `0`.

```bash
morse entry read 0 --via-aggregator
```

The optional `--via-aggregator` flag routes reads through the Walrus aggregator, which is more reliable on testnet. Without it, testnet reads frequently fail with `No valid blob metadata could be retrieved from any storage node`, especially right after an upload - see [CLI Cookbooks → Reading It Back](https://docs.morsecms.xyz/cli-workflows.html#reading-it-back).

```output
{"title": "Hello World", "body": "My first post on Morse."}
```

> **TIP: You're live on-chain**
>
> Your content is stored on Walrus and registered on Sui testnet. Run `morse status` to see your active context, or `morse entry list` to see all entries in the collection.

If you hit errors at any step, run `morse --help` for command usage or see the [CLI Cookbooks → Troubleshooting](https://docs.morsecms.xyz/cli-workflows.html#troubleshooting) section.

## Next Steps

- [CLI: Command Reference](https://docs.morsecms.xyz/cli-commands.html): Every command and flag: publication, collection, entry, revision, cap.
- [CLI: Cookbooks](https://docs.morsecms.xyz/cli-workflows.html): Multi-step recipes: encrypted entries, multi-writer setups, CI/CD scripting.
- [Core Concepts](https://docs.morsecms.xyz/core-concepts.html): Understand the data model - publications, collections, entries, and revisions.
