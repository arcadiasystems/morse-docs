> Source: https://docs.morsecms.xyz/quick-start-cli.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Quick Start: CLI

> Install morse-cli and go from zero to published content on testnet in under five minutes. No contracts, no code, just your terminal.

- About 5 minutes
- Bun or Node
- Funded Sui wallet
- Sui testnet

> **WARNING: Network status**
>
> Morse runs on **Walrus Mainnet and testnet**. On mainnet, gas and Walrus storage cost real SUI and WAL, and there is no faucet. Test on testnet first, and read [Walrus Mainnet](https://docs.morsecms.xyz/mainnet.html) before you switch. Sui and Walrus testnets reset periodically (Walrus wipes every few months), so stored content and object IDs are lost on reset. Do not publish anything you cannot afford to lose.

## Prerequisites

| Requirement | Details | Purpose |
| --- | --- | --- |
| Bun or Node | v1.2+ / ≥ 18 | JavaScript runtime |
| Sui wallet | Sui Wallet, Suiet, or any Sui-compatible wallet | Signing transactions on testnet |
| SUI + WAL tokens | [SUI faucet](https://faucet.sui.io/) · [Swap SUI for WAL](https://stake-wal.wal.app/?network=testnet) | Gas fees (SUI) and Walrus storage fees (WAL) |
| Bech32 private key | A `suiprivkey1...` string | CLI authentication. Export from your wallet's settings |

## Installing

Install the CLI globally using your preferred package manager.

```bash
npm i -g @arcadiasystems/morse-cli
```

```bash
bun add -g @arcadiasystems/morse-cli
```

Verify the installation:

```bash
morse --help
```

## Creating a profile

A profile stores your network, RPC endpoint and active context. Create one for testnet:

```bash
morse config add testnet --network testnet
```

Verify your profile is active:

```bash
morse status
```

## Importing your key

Import a Sui private key into the encrypted keystore. The CLI prompts interactively for the key and a password. Keys are never passed as flags.

```bash
morse account import
```

> **INFO: Key format**
>
> Paste a Bech32 `suiprivkey1...` string. Export one from your wallet's settings. For non-interactive environments (CI, scripts), set `MORSE_PRIVATE_KEY` instead; the CLI uses it directly and skips the keystore prompt.

## Creating a publication

This creates a publication with a globally unique slug and auto-selects it as the active context.

```bash
morse publication create --name "My Blog" --slug "my-blog-$(date +%s)"
```

> **INFO: Slugs are globally unique**
>
> Like usernames, a slug can only be registered once on the whole network. The timestamp suffix keeps this command collision-free for everyone following this guide. For a real project, pick any unused slug. If a slug is taken, the transaction aborts with `ESlugAlreadyExists`.

```output
Creating "My Blog"...
Created "My Blog" (0x23d2...)
  ownerCap:     0xa40a...
  publisherCap: 0x6141...
  tx:           7nF2n...
Selected as the active publication.
```

> **INFO: Which IDs to save**
>
> The CLI auto-selects new publications and collections as your active context, so you rarely need to paste IDs. If you need them later, run `morse status` to see your active publication ID and collection.

## Creating a collection

Collections group entries within a publication. The CLI auto-selects the new collection as your active context, so subsequent entry commands target it automatically.

```bash
morse collection create posts
```

```output
Creating collection "posts" (blob)...
Created collection "posts".
Selected as the active collection. (tx: DWkD...)
```

## Publishing an entry

Create a content file and publish it. The CLI uploads the file to Walrus and registers the entry on-chain.

> **WARNING: This step needs WAL, not just SUI**
>
> Everything up to here only cost SUI gas. Uploading to Walrus also spends WAL. Make sure your account holds both before running this (swap SUI for WAL at [stake-wal.wal.app](https://stake-wal.wal.app/?network=testnet)), or the upload fails with `Insufficient WAL balance`.

```bash
echo '{"title": "Hello World", "body": "My first post on Morse."}' > post.json
```

Publish it. The CLI targets the active publication and collection by default. You can override with `-P <slug|id>` and `-C <name>`:

```bash
morse entry add hello --file post.json
```

```output
Uploading 65 bytes to Walrus...
✔ Added entry #0 "hello" (tx: D9Yfjk...)
  view: https://aggregator.walrus-testnet.walrus.space/v1/blobs/0iKeii...
```

## Reading it back

Fetch the entry content by its ID. Entry IDs are monotonic; your first entry is `0`.

```bash
morse entry read 0
```

`entry read` fetches the content from the Walrus storage nodes and checks it against the blob id recorded on Sui. See [CLI Cookbooks → Reading it back](https://docs.morsecms.xyz/cli-workflows.html#reading-it-back).

```output
{"title": "Hello World", "body": "My first post on Morse."}
```

> **TIP: You are live on-chain**
>
> Your content is stored on Walrus and registered on Sui testnet. Run `morse status` to see your active context, or `morse entry list` to see all entries in the collection. If you hit errors at any step, run `morse --help` or see the [CLI Cookbooks](https://docs.morsecms.xyz/cli-workflows.html#troubleshooting) troubleshooting section.

## Next steps

- [CLI: Command Reference](https://docs.morsecms.xyz/cli-commands.html): Every command and flag: publication, collection, entry, revision, cap.
- [CLI: Cookbooks](https://docs.morsecms.xyz/cli-workflows.html): Multi-step recipes: encrypted entries, multi-writer setups, CI/CD scripting.
- [Core Concepts](https://docs.morsecms.xyz/core-concepts.html): The data model: publications, collections, entries and revisions.
