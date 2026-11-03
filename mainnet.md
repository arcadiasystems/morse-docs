> Source: https://docs.morsecms.xyz/mainnet.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Walrus Mainnet

> Morse runs on Walrus Mainnet. This page covers what changes when you move from testnet: the deployment, the risks, setup, uploads and encrypted content.

> **WARNING: Read this before you switch**
>
> Gas and Walrus storage cost **real SUI and WAL**, and there is **no faucet**. **Deletions can't be undone.** Test every flow on testnet first, then repeat it on Walrus Mainnet.

## Status

Morse has been live on Walrus Mainnet since 2026-09-09. The CLI and SDK ship with the mainnet addresses built in, so there are no addresses to supply. These are the current releases:

| Package | Current release |
| --- | --- |
| [`@arcadiasystems/morse-sdk`](https://docs.morsecms.xyz/sdk-overview.html) | 0.11.0 |
| [`@arcadiasystems/morse-cli`](https://docs.morsecms.xyz/cli-overview.html) | 0.13.0 |
| [`@arcadiasystems/morse-uploader`](https://docs.morsecms.xyz/uploader.html) | 0.4.2 |

An app that uses morse-uploader 0.4.2 stays on morse-sdk 0.10.1, because the uploader does not accept morse-sdk 0.11. See [React Uploader → Install](https://docs.morsecms.xyz/uploader.html#install).

The default storage-node read path for `morse entry read` and `morse entry decrypt` works from morse-cli 0.11.0 and morse-sdk 0.9.0. Upgrade if you are on an earlier release.

Public publications, collections, entries and files work on both networks. Encrypted content needs your own Seal credentials on mainnet. See [Encrypted content](#encrypted-content).

## The deployment

Mainnet runs version 1 of the Morse Move package. It has never been upgraded, so `published-at` and `original-id` are the same address.

| Field | Value |
| --- | --- |
| Package (`published-at`) | [`0x4fc7af5d1e19f96e5fab4e677948214eec35e238b252a106c7d5036dcebdcae2`](https://suiscan.xyz/mainnet/object/0x4fc7af5d1e19f96e5fab4e677948214eec35e238b252a106c7d5036dcebdcae2) |
| `original-id` | `0x4fc7af5d1e19f96e5fab4e677948214eec35e238b252a106c7d5036dcebdcae2` |
| `PublicationRegistry` | `0x8d8b23c7acd7c1b260c793f2c648c5be8eb06db7c107b9f06ca3f39b700868ea` |
| Version | 1 |
| Published | 2026-09-09 |

You only need these ids for raw contract calls. Use `published-at` as the target of Move calls, and `original-id` for type-filtered queries. The source of truth is [`Published.toml`](https://github.com/arcadiasystems/morse-dcms/blob/main/morse-contracts/Published.toml). To build those calls yourself, see [Quick Start: Smart Contracts](https://docs.morsecms.xyz/quick-start-contracts.html).

## Setting up

Fund the address you will use with SUI for gas and WAL for Walrus storage. There is no faucet on mainnet, so you have to acquire both.

Nothing carries over from testnet. Mainnet has its own package and its own `PublicationRegistry`, so you create your publications and collections again.

### CLI

Keep mainnet in its own profile, so your testnet profile stays as it is. Create the profile, make it the default, import the key that pays on mainnet, and check the result:

```bash
morse config add mainnet --network mainnet
morse config use mainnet
morse account import
morse status
```

`account import` prompts for the key and a password. If the key is already in your keystore, run `morse account use <address>` instead.

Nothing selects mainnet for you. With no `--network`, `MORSE_NETWORK` or profile setting, the CLI targets testnet. Every command that spends gas prints the network it used, and `--json` output has a `network` field. To go back to the testnet profile from the quick start, run `morse config use testnet`.

### SDK

`morseConfig({ network: "mainnet" })` returns the full mainnet config, with the contract addresses built in. Use the same network for the gRPC client and the Walrus adapters. Start from the [server setup](https://docs.morsecms.xyz/sdk-client-setup.html#server-setup) and change every network literal to `"mainnet"`:

```typescript
const config = morseConfig({ network: "mainnet" });
const client = new SuiGrpcClient({
  network: "mainnet",
  baseUrl: config.rpcUrl,
});
const walrus = DefaultWalrusWriteAdapter.fromConfig(
  { network: "mainnet", suiClient: client },
  keypair,
);
```

## Uploads and the upload relay

A direct upload sends slivers to every storage node in the Walrus committee at once: about 95 on mainnet. Many networks can't sustain that burst. The upload then fails with `NotEnoughBlobConfirmationsError` or "Unable to connect", even when the nodes are healthy. If uploads fail while reads work, this is almost certainly why. It is not a fault in your config.

Retry through the upload relay, which takes one connection instead of about 95. `--upload-relay` is a global option, so it goes before the subcommand:

```bash
morse --upload-relay auto entry add hello --file post.json
```

`auto` picks Mysten's canonical relay for the network. To use the relay for every upload, save it on the profile. Running `config add` on an existing profile updates it and keeps its other settings:

```bash
morse config add mainnet --network mainnet --upload-relay auto
```

Three things to know before you use it:

- **It charges a small tip per upload**, on top of WAL and gas.
- **The tip is capped.** `--max-tip` sets the cap in MIST and defaults to 10000000 (0.01 SUI). Over the cap, the upload is refused before anything is spent.
- **The relay sees your bytes.** Encrypt first if that matters.

The relay is opt-in. The direct path is free and trustless, and most networks handle it fine. In the SDK, pass `uploadRelay` with a `host` and a `sendTip.max` cap to `DefaultWalrusWriteAdapter.fromConfig`. For browser apps, see [React Uploader → Walrus upload relay](https://docs.morsecms.xyz/uploader.html#upload-relay). The CLI README covers the relay in [When uploads fail: the upload relay](https://github.com/arcadiasystems/morse-dcms/blob/main/morse-cli/README.md#when-uploads-fail-the-upload-relay).

Storage is paid per epoch. A testnet epoch is roughly a day, and mainnet epochs are much longer, so the same `--epochs` value buys a very different duration.

## Encrypted content

Encrypted commands need Seal key servers. Testnet pins an open set, so they work there with no setup. Walrus Mainnet pins none, because every Seal operator there is commercial. You bring your own credential. Without one, the CLI's encrypted commands exit with code 2 and an explanation.

In the CLI, set one of these environment variables:

| Variable | Use |
| --- | --- |
| `MORSE_SEAL_API_KEY` | Credential for Mysten's Seal committee. The CLI already knows the committee's object id and aggregator. |
| `MORSE_SEAL_API_KEY_NAME` | Header name for that credential. Defaults to `X-API-Key`. |
| `MORSE_SEAL_KEY_SERVERS` | JSON array of `{ objectId, weight }` for an operator that is not the committee. Wins over `MORSE_SEAL_API_KEY`. |

They are environment variables, not flags, so the credential stays out of `ps` and shell history. Before it encrypts anything, the CLI checks the credential and refuses if the operator answers `401` or `403`. Without that check, a bad credential would let encryption succeed and decryption fail, and you would pay to store content nobody can read.

In the SDK, `DefaultSealAdapter.fromMorseConfig` throws `ConfigurationError` on mainnet until you supply key servers. `MAINNET_SEAL_COMMITTEE` is Mysten's committee in the right shape. Add the `apiKeyName` and `apiKey` that Mysten issues you, and pass the result to `morseConfig` as `sealKeyServers`. For browser apps, see [React Uploader → Encrypted files and Seal on Walrus Mainnet](https://docs.morsecms.xyz/uploader.html#seal-on-walrus-mainnet).

Encryption has not been verified end to end on Walrus Mainnet, because that needs a commercial credential. The CLI README covers the setup in [Seal on mainnet](https://github.com/arcadiasystems/morse-dcms/blob/main/morse-cli/README.md#seal-on-mainnet).

## Next steps

- [Quick Start: CLI](https://docs.morsecms.xyz/quick-start-cli.html): Run the whole flow on testnet from your terminal before you switch.
- [Quick Start: SDK](https://docs.morsecms.xyz/quick-start-sdk.html): Run the same flow on testnet as a TypeScript script.
- [CLI: Command Reference](https://docs.morsecms.xyz/cli-commands.html): Every command and flag, including profiles and the global options.
- [SDK: Setup](https://docs.morsecms.xyz/sdk-client-setup.html): Install, wire a wallet, pick a Walrus adapter, handle errors.
