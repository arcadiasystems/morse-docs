> Source: https://morsecms-docs.vercel.app/cli-commands.html · Full docs: https://morsecms-docs.vercel.app/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/MandaWeb3/morse-docs/issues/new?labels=docs-feedback

# CLI Command Reference

> Complete reference for every `morse-cli` command, organized by resource: context, config, account, publication, collection, entry, revision, and cap.

## Global Options

Global options apply to every command and must appear before the subcommand (e.g. `morse --json publication list`).

| Option | Purpose |
| --- | --- |
| `--network <testnet\|localnet>` | Network to target (default: testnet). |
| `-p, --profile <name>` | Config profile to use. |
| `--rpc <url>` | Override the Sui RPC URL. |
| `--json` | Machine-readable JSON on stdout. |
| `-q, --quiet` | Suppress progress and informational output. |
| `-y, --yes` | Assume yes for confirmation prompts. |
| `--debug` | Print stack traces on error. |
| `-V, --version` | Print the version. |
| `-h, --help` | Show help for any command. |

## Shared Command Flags

These flags appear across multiple command groups. Command-specific flags are shown inline in each category below.

| Short | Long | Purpose |
| --- | --- | --- |
| `-P` | `--publication <slug\|id>` | Target publication (default: active context). |
| `-C` | `--collection <name>` | Target collection (default: active context). |
| `-f` | `--file <path>` | Input file (`-` for stdin). Used by content commands. |
| `-n` | `--name <name>` | Publication name (used by `publication create`). |
| `-s` | `--slug <slug>` | URL slug (used by `publication create`). |

## Argument Notation

Values in `<angle brackets>` are required; values in `[square brackets]` are optional; `(a | b)` means one of the two is required.

| Argument | Format | Example |
| --- | --- | --- |
| `<entryId>` | Zero-based integer index within the collection. | `0` |
| `[revisionIndex]` | Zero-based integer index within the entry. Latest when omitted. | `0` |
| `<draftRevisionId>` | Zero-based integer revision ID of the draft to publish. | `1` |
| `<publisherCapId>` | Sui object ID of a PublisherCap. | `0x3a…` |
| `<address>`, `<recipient>`, `<holder>` | Sui address. | `0xf1…` |
| `<publication>` | Publication slug or Sui object ID. | `my-blog`, `0x7c…` |

## Context

Set the active publication and collection so subsequent commands use them automatically.

| Command | Purpose |
| --- | --- |
| `use <publication> [collection]` | Set the active publication (slug or id) and collection (optional). Omitting the collection clears it. |
| `use --clear` | Clear the active context. |
| `status` | Show the active profile, network, account, publication, and collection. |

```example
$ morse use my-blog posts
Switched to publication "my-blog", collection "posts".

$ morse status
  profile:     testnet
  network:     testnet
  account:     0x71a3...9f2b
  publication: my-blog (0x1a2b...)
  collection:  posts
```

## Config

Configure CLI profiles, each pointing to a different network and account.

| Command | Purpose |
| --- | --- |
| `config add <name> --network <net> [--rpc <url>]` | Create or update a profile. |
| `config list` | List profiles; `*` marks the active. |
| `config use <name>` | Set the active profile. |
| `config remove <name>` | Delete a profile. |
| `config path` | Print the config file path. |

```example
$ morse config add testnet --network testnet
Profile "testnet" created and set as default.
```

## Account

Import, list, and manage keypairs used for signing transactions.

| Command | Purpose |
| --- | --- |
| `account import` | Import a key into an encrypted keystore (hidden prompts for key + password). |
| `account list` | List imported accounts; `*` marks the active one. |
| `account show` | Print the active account address. |
| `account use <address>` | Set the active account for the current profile. |
| `account export <address>` | Reveal a decrypted key (interactive-only, dangerous). |

```example
$ morse account list
* 0x71a3...9f2b
  0xd4e5...6f7a
```

## Publication

Create and manage publications - the top-level content containers.

| Command | Purpose |
| --- | --- |
| `publication get [<slug\|id>]` | Fetch a publication (default: active). |
| `publication list [<address>] [--ids-only] [--limit <n>] [--cursor <cursor>]` | List publications owned by an address (default: active account). `--ids-only` returns bare IDs; `--limit` / `--cursor` paginate. |
| `publication create --name <name> --slug <slug>` | Create a publication and set it as the active one. |
| `publication delete [publication] [--owner-cap <id>]` | Delete an empty publication. `--owner-cap` overrides auto-resolved OwnerCap. |
| `publication transfer-ownership <recipient> [-P <slug\|id>] [--owner-cap <id>]` | Transfer the OwnerCap to another address. `--owner-cap` overrides auto-resolved OwnerCap. |

```example
$ morse publication create --name "My Blog" --slug my-blog
Created publication "My Blog".
  slug:          my-blog
  publicationId: 0x1a2b...3c4d
  ownerCapId:    0x5e6f...7a8b
```

## Collection

Create and manage collections within a publication.

| Command | Purpose |
| --- | --- |
| `collection list [-P <slug\|id>]` | List collections in a publication. |
| `collection create <name> [--mode blob\|quilt] [-P <slug\|id>] [--publisher-cap <id>]` | Create a collection and set it as the active one. `--publisher-cap` overrides auto-resolved PublisherCap. |
| `collection delete <name> [-P <slug\|id>] [--publisher-cap <id>]` | Delete an empty collection. `--publisher-cap` overrides auto-resolved PublisherCap. |

```example
$ morse collection create posts --mode blob
Created collection "posts". Selected as the active collection. (tx: AbCdEf...)
```

## Entry

Add, read, and delete entries within a collection.

| Command | Purpose |
| --- | --- |
| `entry get <entryId>` | Fetch a single entry's metadata. |
| `entry read <entryId> [<revisionIndex>] [--out <path>] [--via-aggregator]` | Fetch a public entry's content to stdout or a file. Reads the latest revision unless `revisionIndex` is specified; `--via-aggregator` fetches through a Walrus aggregator instead of directly. |
| `entry list [--limit <n>] [--cursor <cursor>] [--drafts-only]` | List entries. `--drafts-only` filters to unpublished entries. |
| `entry scan [--drafts-only]` | List every entry (auto-paginated). `--drafts-only` filters to unpublished entries. |
| `entry add <name> (--file <path> \| --stdin) [--content-type <type>] [--epochs <n>] [--publisher-cap <id>]` | Upload content and add a new entry. `--file` reads from a file path, `--stdin` reads from standard input; `--content-type` is inferred from file extension when omitted; `--epochs` sets Walrus storage duration (default 3). |
| `entry delete <entryId> [--publisher-cap <id>]` | Delete an entry and its revisions. |
| `entry add-encrypted <name> (--file <path> \| --stdin) [--content-type <type>] [--epochs <n>] [--publisher-cap <id>]` | Encrypt with Seal, upload, and add a new entry. |
| `entry decrypt <entryId> [<revisionIndex>] [--out <path>] [--publisher-cap <id>] [--via-aggregator]` | Decrypt an encrypted revision; reads the latest unless `revisionIndex` is specified. Signs a SessionKey with the active account. |

> **WARNING: Encrypted entries are always created as drafts**
>
> Encrypted entries are always created as drafts - there is no public head yet. Published revisions are always unencrypted and public, so to publish an encrypted entry you must supply a new unencrypted blob. A revision cannot be both published and encrypted. See [Entries -> Adding an Entry](https://morsecms-docs.vercel.app/entries.html#adding-an-entry) for the full explanation.

```example
$ morse entry add welcome-post --file ./welcome.json
Added entry #0 "welcome-post". (tx: AbCdEf...)
  https://aggregator.walrus-testnet.walrus.space/v1/blobs/...
```

## Revision

Manage drafts and published revisions of an entry.

| Command | Purpose |
| --- | --- |
| `revision publish-direct <entryId> (--file <path> \| --stdin) [--content-type <type>] [--epochs <n>] [--publisher-cap <id>]` | Upload content and append a public revision. |
| `revision append-draft <entryId> (--file <path> \| --stdin) [--content-type <type>] [--epochs <n>] [--publisher-cap <id>]` | Upload content and append a draft revision. |
| `revision publish-from-draft <entryId> <draftRevisionId> [--file <path> \| --stdin] [--content-type <type>] [--epochs <n>] [--publisher-cap <id>]` | Publish a draft as a new revision; reuses the draft's content by default, pass `--file`/`--stdin` to replace it. |

```example
$ morse revision publish-direct 0 --file ./welcome-v2.json
Published revision #1 on entry #0. (tx: AbCdEf...)
```

## Cap

Issue, revoke, and transfer publisher capabilities.

| Command | Purpose |
| --- | --- |
| `cap list [<address>] [--limit <n>] [--cursor <cursor>]` | List PublisherCaps held by an address. |
| `cap issue <holder> [-P <slug\|id>] [--owner-cap <id>]` | Issue a PublisherCap bound to an address. |
| `cap revoke <publisherCapId> [-P <slug\|id>] [--owner-cap <id>]` | Revoke a PublisherCap. |
| `cap destroy <publisherCapId> [-P <slug\|id>]` | Destroy a PublisherCap you hold. |
| `cap transfer <publisherCapId> <recipient>` | Transfer a PublisherCap object. Does not change the `holder` binding - the recipient cannot use or destroy the cap unless they are the bound holder. To rotate access, destroy the old cap and issue a new one. |

```example
$ morse cap issue 0x71a3...9f2b
Issued PublisherCap 0xCAP_ID to 0x71a3...9f2b. (tx: AbCdEf...)
```

`OwnerCap` and `PublisherCap` IDs are auto-resolved from the active account when the `--owner-cap` / `--publisher-cap` override is omitted. Morse separates ownership from publishing. 
See [Access Control -> OwnerCap](https://morsecms-docs.vercel.app/access-control.html#ownercap) and [Access Control -> PublisherCap](https://morsecms-docs.vercel.app/access-control.html#publishercap) for how capability-based authorization works.

## Next Steps

- [CLI: Cookbooks](https://morsecms-docs.vercel.app/cli-workflows.html): Step-by-step recipes: publishing, encrypted entries, multi-writer setups, CI/CD scripting.
- [Quick Start: CLI](https://morsecms-docs.vercel.app/quick-start-cli.html): Create your first publication, collection, and entry from the terminal.
