> Source: https://docs.morsecms.xyz/cli-commands.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# CLI Command Reference

> Complete reference for every `morse-cli` command, organized by resource: context, config, account, publication, collection, entry, revision, cap, and file.

## Global options

Global options apply to every command and must appear before the subcommand (e.g. `morse --json publication list`).

| Option | Purpose |
| --- | --- |
| `--network <mainnet\|testnet\|localnet>` | Network to target (default: testnet). |
| `-p, --profile <name>` | Config profile to use. |
| `--rpc <url>` | Override the Sui RPC URL. |
| `--upload-relay <url\|auto>` | Upload Walrus blobs through a relay instead of sending them to every storage node; `auto` picks the network's canonical relay. Costs a tip per upload. |
| `--max-tip <mist>` | Cap the relay's per-upload tip, in MIST (default: 10000000). Only applies with `--upload-relay`. |
| `--json` | Machine-readable JSON on stdout. |
| `-q, --quiet` | Suppress progress and informational output. |
| `-y, --yes` | Assume yes for confirmation prompts. |
| `--debug` | Print stack traces on error. |
| `-V, --version` | Print the version. |
| `-h, --help` | Show help for any command. |

## Shared command flags

These flags appear across multiple command groups. Command-specific flags are shown inline in each category below.

| Short | Long | Purpose |
| --- | --- | --- |
| `-P` | `--publication <slug\|id>` | Target publication (default: active context). |
| `-C` | `--collection <name>` | Target collection (default: active context). |
| `-f` | `--file <path>` | Input file (`-` for stdin). Used by content commands. |
| `-n` | `--name <name>` | Name of a publication (`publication create`) or a file (`file upload`, `file register`, `file update`). |
| `-s` | `--slug <slug>` | URL slug (used by `publication create`). |

## Argument notation

Values in `<angle brackets>` are required; values in `[square brackets]` are optional; `(a | b)` means one of the two is required; `...` means the flag can be repeated.

| Argument | Format | Example |
| --- | --- | --- |
| `<entryId>` | Zero-based integer index within the collection. | `0` |
| `[revisionIndex]` | Zero-based integer index within the entry. Latest when omitted. | `0` |
| `<draftRevisionId>` | Zero-based integer revision ID of the draft to publish. | `1` |
| `<publisherCapId>` | Sui object ID of a PublisherCap. | `0x3a…` |
| `<address>`, `<recipient>`, `<holder>`, `<newOwner>` | Sui address. | `0xf1…` |
| `<publication>` | Publication slug or Sui object ID. | `my-blog`, `0x7c…` |
| `<file>` | Sui object ID of a RecipientFile. | `0x5f…` |

## Context

Set the active publication and collection so subsequent commands use them automatically.

| Command | Purpose |
| --- | --- |
| `use <publication> [collection]` | Set the active publication (slug or id) and collection (optional). Omitting the collection clears it. |
| `use --clear` | Clear the active context. |
| `status` | Show the active profile, network, account, publication, and collection. |

```example
$ morse use my-blog posts
Resolving slug "my-blog" among owned publications...
Active publication set to 0x1a2b...3c4d, collection "posts" (profile "testnet").

$ morse status
profile:     testnet
network:     testnet
account:     0x71a3...9f2b
publication: 0x1a2b...3c4d
collection:  posts
```

## Config

Configure CLI profiles, each pointing to a different network and account.

| Command | Purpose |
| --- | --- |
| `config add <name> --network <net> [--rpc <url>] [--upload-relay <url\|auto>]` | Create or update a profile. `--upload-relay` saves a Walrus upload relay on the profile. |
| `config list` | List profiles; `*` marks the active. |
| `config use <name>` | Set the active profile. |
| `config remove <name>` | Delete a profile. |
| `config path` | Print the config file path. |

```example
$ morse config add testnet --network testnet
Saved profile "testnet" (testnet).
```

## Account

Import, list, and manage keypairs used for signing transactions.

| Command | Purpose |
| --- | --- |
| `account import` | Import a key into an encrypted keystore. Reads the key from stdin when it is piped; otherwise prompts for key + password (hidden). |
| `account list` | List imported accounts; `*` marks the active one. |
| `account show` | Print the active account address. |
| `account use <address>` | Set the active account for the current profile. |
| `account export <address>` | Reveal a decrypted key (interactive-only, dangerous). |

To import in a script, pipe the key on stdin and set `MORSE_KEYSTORE_PASSWORD`. With stdin piped there is no terminal to prompt on, so the password must come from that variable. `MORSE_PRIVATE_KEY`, when set, takes priority over stdin. The key is never a flag, because command-line arguments leak through `ps` and shell history.

```example
$ morse account list
* 0x71a3...9f2b
  0xd4e5...6f7a
```

## Publication

Create and manage publications, the top-level content containers.

| Command | Purpose |
| --- | --- |
| `publication get [<slug\|id>]` | Fetch a publication (default: active). |
| `publication list [<address>] [--ids-only] [--limit <n>] [--cursor <cursor>]` | List publications owned by an address (default: active account). `--ids-only` returns bare IDs; `--limit` / `--cursor` paginate. |
| `publication create --name <name> --slug <slug>` | Create a publication and set it as the active one. |
| `publication delete [publication] [--owner-cap <id>]` | Delete an empty publication. `--owner-cap` overrides auto-resolved OwnerCap. |
| `publication transfer-ownership <recipient> [-P <slug\|id>] [--owner-cap <id>]` | Transfer the OwnerCap to another address. `--owner-cap` overrides auto-resolved OwnerCap. |

```example
$ morse publication create --name "My Blog" --slug my-blog
Creating "My Blog"...
Created "My Blog" (0x1a2b...3c4d)
  network:      testnet
  ownerCap:     0x5e6f...7a8b
  publisherCap: 0x9c0d...1e2f
  tx:           AbCdEf...
Selected as the active publication.
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
| `entry read <entryId> [<revisionIndex>] [--out <path>] [--via-aggregator]` | Fetch a public entry's content to stdout or a file. Reads the latest revision unless `revisionIndex` is specified; `--via-aggregator` fetches through a Walrus aggregator instead of the storage nodes: more reliable when storage nodes are flaky, with no client-side blob verification. |
| `entry list [--limit <n>] [--cursor <cursor>] [--all] [--drafts-only]` | List entries. `--all` fetches every page, the same as `entry scan`, and cannot be combined with `--limit` or `--cursor`. `--drafts-only` filters to unpublished entries. |
| `entry scan [--drafts-only]` | List every entry (auto-paginated), the same as `entry list --all`. `--drafts-only` filters to unpublished entries. |
| `entry add <name> (--file <path> \| --stdin) [--content-type <type>] [--epochs <n>] [--publisher-cap <id>]` | Upload content and add a new entry. `--file` reads from a file path, `--stdin` reads from standard input; `--content-type` is inferred from file extension when omitted; `--epochs` sets Walrus storage duration (default 3, roughly 3 days on testnet; renew or re-upload before expiry for longer-lived content). |
| `entry delete <entryId> [--publisher-cap <id>]` | Delete an entry and its revisions. |
| `entry add-encrypted <name> (--file <path> \| --stdin) [--content-type <type>] [--epochs <n>] [--publisher-cap <id>]` | Encrypt with Seal, upload, and add a new entry. |
| `entry decrypt <entryId> [<revisionIndex>] [--out <path>] [--publisher-cap <id>] [--via-aggregator]` | Decrypt an encrypted revision; reads the latest unless `revisionIndex` is specified. Signs a SessionKey with the active account. |

> **WARNING: Encrypted entries are always created as drafts**
>
> Encrypted entries are always created as drafts; there is no public head yet. Published revisions are always unencrypted and public, so to publish an encrypted entry you must supply a new unencrypted blob. A revision cannot be both published and encrypted. See [Entries → Adding an entry](https://docs.morsecms.xyz/entries.html#adding-an-entry) for the full explanation.

```example
$ morse entry add welcome-post --file ./welcome.json
Added entry #0 "welcome-post". (tx: AbCdEf...)
  network:      testnet
  view: https://aggregator.walrus-testnet.walrus.space/v1/blobs/...
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
| `cap revoke <publisherCapId> [-P <slug\|id>] [--owner-cap <id>]` | Revoke a PublisherCap. Asks for confirmation; in scripts pass the global `--yes` before the subcommand (`morse --yes cap revoke <id>`). |
| `cap destroy <publisherCapId> [-P <slug\|id>]` | Destroy a PublisherCap you hold. |
| `cap transfer <publisherCapId> <recipient>` | Transfer a PublisherCap object. Does not change the `holder` binding; the recipient cannot use or destroy the cap unless they are the bound holder. To rotate access, destroy the old cap and issue a new one. |

```example
$ morse cap issue 0x71a3...9f2b
Issued PublisherCap 0xCAP_ID to 0x71a3...9f2b. (tx: AbCdEf...)
```

`OwnerCap` and `PublisherCap` IDs are auto-resolved from the active account when the `--owner-cap` / `--publisher-cap` override is omitted. Morse separates ownership from publishing. 
See [Access Control → OwnerCap](https://docs.morsecms.xyz/access-control.html#ownercap) and [Access Control → PublisherCap](https://docs.morsecms.xyz/access-control.html#publishercap) for how capability-based authorization works.

## File

Upload, register, read, list, and manage RecipientFiles on Walrus. A RecipientFile carries its own recipient list: the addresses allowed to decrypt it. See [Recipient Files → CLI workflows](https://docs.morsecms.xyz/recipient-files.html#cli-workflows) for a full walkthrough.

| Command | Purpose |
| --- | --- |
| `file upload <path> --name <name> (--public \| --encrypt \| -r <addr>...) [--content-type <mime>] [--epochs <n>]` | Upload a file to Walrus and register it on-chain. `--public` stores it unencrypted and prints a view link. `--encrypt` encrypts it with Seal and prints a share string. `-r, --recipient` adds an address that can decrypt it and implies `--encrypt`; the sender is always a recipient. `--content-type` is inferred from the path when omitted; `--epochs` sets Walrus storage duration (default 3). |
| `file register --blob-id <id> --name <name> --content-type <mime> --size <bytes> (--public \| --encrypted --seal-prefix <hex>) [-r <addr>...] [--blob-object-id <id>]` | Register on-chain metadata for a blob already on Walrus. `--size` is the plaintext byte length. `--encrypted` needs the `--seal-prefix` the blob was encrypted under; `-r` applies to encrypted files only. `--blob-object-id` records the Walrus Blob object ID, if known. |
| `file download [<file>] [--out <path>] [--share <string>] [--prefix <hex> --nonce <hex>] [--raw] [--via-aggregator]` | Download a file's content to stdout or a file. Pass a file ID or `--share`. `--share`, or `--prefix` with `--nonce`, decrypts an encrypted file and signs a SessionKey with the active account. Without one, an encrypted file is refused unless `--raw` writes the ciphertext as is. `--via-aggregator` fetches through a Walrus aggregator instead of directly. In `--json` mode, `--out` is required. |
| `file list [--address <addr>] [--accessible] [--hydrate] [--limit <n>] [--indexer-url <url>]` | List files owned by an address (default: active account), rebuilt from contract events. `--accessible` lists files the address can decrypt as a recipient, not just the ones it owns. `--hydrate` fetches each full record (one read per file); `--limit` caps the results. `--indexer-url` sets the Sui GraphQL endpoint to read events from (default: Mysten's endpoint for the network; required on localnet). |
| `file get <file>` | Fetch a file's on-chain metadata and recipient list. |
| `file update <file> --name <name> --content-type <mime>` | Update a file's name and content type. Owner only. |
| `file transfer-ownership <file> <newOwner>` | Transfer a file's ownership. Recipient access does not move with it; the recipient list governs that. Asks for confirmation unless the global `--yes` is passed. |
| `file delete <file>` | Delete a file's metadata record. The Walrus blob is not deleted; it expires with its storage lease. Asks for confirmation unless the global `--yes` is passed. |
| `file recipient add <file> <address>` | Allow an address to decrypt the file. |
| `file recipient remove <file> <address>` | Revoke an address's access to the file. |
| `file recipient list <file>` | List the file's recipients. |

An encrypted upload prints a share string (`mf1.<fileId>.<prefix>.<nonce>`). Save it: the prefix and nonce cannot be recovered from the ciphertext. Recipients need the share string, plus a place on the recipient list, to decrypt with `file download --share`.

```example
$ morse file upload ./logo.png --name logo.png --public
Uploaded public file 0x5f0a...c37e. (tx: AbCdEf...)
  view: https://aggregator.walrus-testnet.walrus.space/v1/blobs/...
```

## Command spellings

Some commands accept a second spelling for the same action. Both spellings do the same thing.

| Command | Also accepts |
| --- | --- |
| `account show` | `account get` |
| `publication get` | `publication show` |
| `entry get` | `entry show` |
| `file get` | `file show` |
| `entry read` | `entry download` |
| `file download` | `file read` |
| `config remove` | `config delete` |
| `cap transfer` | `cap transfer-ownership` |
| `entry scan` | `entry list --all` |

The `publication` group also answers to `pub`, as in `morse pub list`.

## Next steps

- [CLI: Cookbooks](https://docs.morsecms.xyz/cli-workflows.html): Step-by-step recipes: publishing, encrypted entries, multi-writer setups, CI/CD scripting.
- [Quick Start: CLI](https://docs.morsecms.xyz/quick-start-cli.html): Create your first publication, collection, and entry from the terminal.
