> Source: https://docs.morsecms.xyz/index.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Morse: The Decentralized Headless CMS Protocol

> A headless CMS protocol built on Sui and Walrus, for developers building content applications with on-chain ownership and decentralized storage.

> **WARNING: Network status**
>
> Morse runs on **Walrus Mainnet and testnet**, and the contracts are **unaudited**. On mainnet, gas and Walrus storage cost real SUI and WAL, and there is no faucet. Test on testnet first. Sui and Walrus testnets reset periodically (Walrus wipes every few months), so stored content and object IDs are lost on reset. Do not publish anything you cannot afford to lose.

## What is Morse?

Morse lets developers build content applications (blogs, knowledge bases, gated media platforms) where the backend is an open protocol instead of a vendor service. You define content structures, set access policies, and publish through a CLI or TypeScript SDK; the contracts handle identity, permissions, and revision history so there is no central point of failure to trust or migrate away from.

## Why Morse?

Traditional headless CMSs create several long-term constraints:

- **Trust concentration**: one vendor backend controls all identity and data
- **Weak portability**: publication identity and permissions do not travel with you
- **Opaque history**: change and authorization history is hidden inside a closed system
- **Vendor lock-in**: migrating requires re-building your backend from scratch

Morse solves these while keeping the ergonomics of headless CMS architecture. Publication identity is canonical on-chain. Write permissions are capability-based and verifiable. Every revision is auditable. And any team can integrate directly with the contracts, bypassing any specific service provider.

## System architecture

Morse is composed of five layers. Only the contracts are the source of truth; all other layers are replaceable.

- **Control**: Sui Blockchain · Publication Registry · Collections · Entries & Revisions · OwnerCap / PublisherCap
- **Storage**: Walrus · Blob Storage · Quilt Storage
- **Access**: Seal · Publisher Policy · Allowlist Policy
- **Query**: Indexer · Content API
- **Develop**: TypeScript SDK · CLI

> **INFO: The Morse Book**
>
> For the full architecture, from what a headless CMS is to how each layer of Morse fits together, read [The Morse Book](https://app.notion.com/p/thedivic/The-Morse-Book-2f3832ac2ab680e5a403f1dde1e8a900) on Notion.

## Key features

- **On-chain Permission Management**: Publication identity, write permissions, and state transitions are enforced by Move smart contracts: transparent and auditable.
- **Walrus Storage**: Content payloads and assets live in Walrus decentralized storage. Contracts store verifiable references, not bytes.
- **Capability-Based Auth**: OwnerCap and PublisherCap separate permission management from publishing. Revocation is instant and denylist-based.
- **Immutable Revisions**: Every content change is an appended revision. Draft and public heads enable editorial workflows without losing history.
- **Access Policies**: Public, publisher-gated, and subscription access policies control payload retrieval via Seal encryption.
- **Open Protocol**: Anyone can build integrations directly on contracts. Off-chain services are optional ergonomics, not gatekeepers.
- **Agent-First by Design**: A coding agent can provision publications, publish content, and operate the entire backend via CLI or SDK. No centralized provisioning required.

## Component status

| Component | Status | Description |
| --- | --- | --- |
| **Move Contracts** | Active | Publication, collection, entry, and revision management. Deployed on testnet and mainnet. |
| **TypeScript SDK** | Active | Wraps Sui, Walrus, and Seal behind a small adapter pattern. Published as `@arcadiasystems/morse-sdk` on npm (testnet and mainnet). |
| **CLI** | Active | Terminal tool for managing publications, collections, and entries. Published as `@arcadiasystems/morse-cli` on npm (testnet and mainnet). |
| **Indexer** | Planned | Listens to on-chain events and builds read-optimized state. |
| **Content API** | Planned | REST API for querying publications, collections, and entries. |

## Next steps

- [Quick Start](https://docs.morsecms.xyz/quick-start.html): Choose your path (CLI, SDK, or contracts) and go from zero to published content on testnet.
- [Live Demo](https://morse-blog-demo.vercel.app): A working blog running on Morse: wallet-native publishing, on-chain revisions, Seal-gated premium posts. No wallet needed to read.
- [Core Concepts](https://docs.morsecms.xyz/core-concepts.html): Understand the Publication → Collection → Entry model.
- [CLI](https://docs.morsecms.xyz/cli-overview.html): Manage publications and content from your terminal. Encrypted keystore, active context, no IDs to paste.
- [SDK](https://docs.morsecms.xyz/sdk-overview.html): Build on Morse from Node or the browser. Adapter pattern, branded IDs, structured errors.
