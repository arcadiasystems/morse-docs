> Source: https://docs.morsecms.xyz/sdk-overview.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# SDK Overview

> `morse-sdk` is the TypeScript client for the Morse decentralized CMS protocol. It packages Sui transaction building, Walrus blob upload and download, and Seal threshold encryption behind a small, swappable adapter pattern.

> **WARNING: When contract addresses change**
>
> During the pre-release phase, contract addresses change on every redeployment. To pick up the new addresses, bump your `morse-sdk` version. Each release pins the latest `packageId` and `originalPackageId` into `morseConfig()`. Publications and other objects created under a previous contract instance remain on-chain but belong to the old package; they are **not** migrated to the new deployment.

## Getting started

Install the SDK and its peer dependencies, then wire a wallet adapter and Walrus configuration for your environment. See [SDK Setup](https://docs.morsecms.xyz/sdk-client-setup.html) for installation and configuration, and [SDK Cookbooks](https://docs.morsecms.xyz/sdk-workflows.html) for step-by-step guides.

## Capabilities

- **Adapter pattern** — Four swappable adapters (wallet, Walrus write, Walrus read, Seal) with shipped defaults and easy substitution for custom flows.
- **Branded ID types** — PublicationId, PublisherCapId, OwnerCapId, BlobObjectId, WalrusBlobId, QuiltPatchId, and more. Compile-time guards against passing the wrong ID into the wrong call.
- **Structured errors** — Every throw extends MorseError. Narrow by class + property (e.g. ContractAbortError.reason); no string parsing.
- **2-transaction uploads** — addEntryFromBytes collapses register + certify + add-entry into 2 transactions instead of 3 via a flow-aware Walrus capability.
- **End-to-end tests** — End-to-end scripts/phase-N-*.ts run against live testnet (real WAL, real SUI) to verify the public surface on every release.
- **97% test coverage** — ~97% line / ~96% function coverage. Lint, typecheck, test, build all gate every change.

## Adapter architecture

The SDK is built around four swappable abstractions. Pick the shipped default or implement the interface against whatever signing / storage / encryption stack you already have.

- **Wallet**: WalletAdapter · KeypairAdapter · WalletStandardSigner
- **Walrus Write**: WalrusWriteAdapter · DefaultWalrusWriteAdapter · HttpPublisherWriteAdapter
- **Walrus Read**: WalrusReadAdapter · DefaultWalrusReadAdapter · HttpAggregatorReadAdapter
- **Encryption**: SealAdapter · DefaultSealAdapter

The rest of the SDK (functions like `createPublication`, `addEntryFromBytes`, the `RpcPublicationReader`) composes these adapters. Swapping an adapter requires no changes to call sites.

## Known limitations

- **Testnet only at v0.x.** Mainnet config is released once the contracts are stable.
- **gRPC client only.** Reader and adapter interfaces are typed against `SuiGrpcClient` from `@mysten/sui/grpc`. JSON-RPC fallback is planned.
- **No encrypted publish path.** The Move contract hardcodes `encrypted=false` on `publish_from_draft` and `publish_direct`. Encrypted content stays as drafts. See [SDK Cookbooks → Encrypted content](https://docs.morsecms.xyz/sdk-workflows.html#encrypted-content) for the full lifecycle.
- **Only the `Publisher` access policy is enforced.** The `Subscription` policy is not yet active.
- **`listEntries` is not sorted chronologically.** Results follow on-chain storage order. Sort by `entry.id` for insertion order.
- **zkLogin support is untested.** The decoder is included, but Walrus and Seal `SessionKey` flows have not been verified with zkLogin signatures. Use keypair or passkey accounts until you have tested your setup.

> **WARNING: Encrypted entries are always created as drafts**
>
> Encrypted entries are always created as drafts. You must explicitly publish them with a separate transaction after adding. The Move contract hardcodes `encrypted=false` on `publish_from_draft` and `publish_direct`, so published revisions are always unencrypted and public. See [Entries → Adding an entry](https://docs.morsecms.xyz/entries.html#adding-an-entry) for the full explanation.

## Next steps

- [SDK: Setup](https://docs.morsecms.xyz/sdk-client-setup.html): Install, wire a wallet, pick a Walrus adapter, handle errors.
- [SDK: Cookbooks](https://docs.morsecms.xyz/sdk-workflows.html): Create publications and collections, add entries (plain + encrypted), read them back.
