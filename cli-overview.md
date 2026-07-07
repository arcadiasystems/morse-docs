> Source: https://docs.morsecms.xyz/cli-overview.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/MandaWeb3/morse-docs/issues/new?labels=docs-feedback

# CLI Overview

> `morse-cli` is the command-line client for the Morse decentralized CMS. It signs with a locally encrypted key, stores content on Walrus, and encrypts private entries with Seal: the same protocol surface as the SDK, driven from your terminal. Runs on Node or Bun, pre-release on testnet.

> **INFO: Published on npm · testnet only**
>
> Install `@arcadiasystems/morse-cli` from npm. The CLI is currently configured for testnet only. Mainnet support to be added soon.

## Installing

The published binary is a Node-targeted bundle. You need Node (>= 18) or Bun (>= 1.2) to run it.

```bash
npm i -g @arcadiasystems/morse-cli
morse --help
```

Also available via `bun add -g` or `pnpm add -g`. 
 
 Or run without installing:

```bash
npx @arcadiasystems/morse-cli --help
```

## Getting Started

Select an active publication and collection once - all subsequent commands will use them automatically, so you never have to paste a 64-character object ID. `publication create` and `collection create` auto-select the new object. 

See [CLI Cookbooks](https://docs.morsecms.xyz/cli-workflows.html) for step-by-step guides.

## Active Context

The active publication and collection live in the current profile. Override per command with `-P, --publication <slug|id>` and `-C, --collection <name>`. Slugs resolve against publications owned by the active account.

- `morse use <slug|id> [collection]`: set the active publication and collection (optional)
- `morse use --clear`: clear the active context
- `morse status`: show the active profile, account, publication, and collection

## Security Model

Private keys are stored in an encrypted keystore (scrypt + AES-256-GCM) and unlocked by a password.

- Keys are **never accepted as command-line flags**. They come only from an interactive hidden prompt, the `MORSE_PRIVATE_KEY` env var, or the encrypted keystore.
- Keystore files are written `chmod 600`; group- or world-readable key files are refused on read.
- Keys are never printed or logged, including under `--debug`. The sole exception is `account export`, which deliberately reveals a key: interactive-only, requires confirmation, unavailable in `--json`.
- For CI, set `MORSE_PRIVATE_KEY` (raw key, never persisted) and `MORSE_KEYSTORE_PASSWORD` to skip prompts.

## Configuration

Settings resolve with the precedence `flags` > `MORSE_* env` > `config file` > `defaults`. The config file lives under `$XDG_CONFIG_HOME/morse` (default `~/.config/morse`); encrypted keystores live in `keystores/` beside it.

| Variable | Overrides | Notes |
| --- | --- | --- |
| `MORSE_PROFILE` | `-p, --profile` | Profile to use. |
| `MORSE_NETWORK` | `--network` | `testnet` or `localnet`. |
| `MORSE_RPC_URL` | `--rpc` | Sui RPC URL override. |
| `MORSE_ADDRESS` | (no flag) | Active account address. |
| `MORSE_PUBLICATION` | `-P, --publication` | Active publication ID. |
| `MORSE_COLLECTION` | `-C, --collection` | Active collection name. |
| `MORSE_PRIVATE_KEY` | (no flag) | Raw Bech32 secret key. Highest-priority key source; never persisted. |
| `MORSE_KEYSTORE_PASSWORD` | (no flag) | Keystore password for non-interactive unlock. |

## Output & Scripting

- Human-readable output goes to **stdout**; progress, warnings, and prompts go to **stderr**. Redirecting stdout yields only the result.
- In `--json` mode, `bigint` values (e.g. `gasUsedMist`) are encoded as decimal strings and byte arrays (`sealId`, quilt patch IDs) as `0x`-hex.
- Color is emitted only to a TTY and honors `NO_COLOR` / `FORCE_COLOR`.

See [CLI Command Reference → Global Options](https://docs.morsecms.xyz/cli-commands.html#global-options) for a full list of global flags (`--json`, `--quiet`, `--yes`, and more).

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Generic error (contract abort, uncategorized) |
| `2` | Usage error (bad flags/args, invalid ID/slug/address, declined confirmation) |
| `3` | Not found |
| `4` | Auth or permission failure (keystore unlock, unauthorized, no-access) |
| `5` | Network or transport failure |

## Next Steps

- [CLI: Command Reference](https://docs.morsecms.xyz/cli-commands.html): Every command and flag: config, account, publication, collection, entry, revision, cap.
- [CLI: Cookbooks](https://docs.morsecms.xyz/cli-workflows.html): Step-by-step recipes: publishing, encrypted entries, multi-writer setups, CI/CD scripting.
- [Quick Start: CLI](https://docs.morsecms.xyz/quick-start-cli.html): The protocol concepts the CLI drives: publications, collections, entries.
