> Source: https://morsecms-docs.vercel.app/index.html · Full docs: https://morsecms-docs.vercel.app/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/MandaWeb3/morse-docs/issues/new?labels=docs-feedback

# Morse - The Decentralized Headless CMS Protocol

> A headless CMS protocol built on Sui and Walrus, for developers building content applications with on-chain ownership and decentralized storage.

## What is Morse?

Morse lets developers build content applications - blogs, knowledge bases, gated media platforms - where the backend is an open protocol instead of a vendor service. You define content structures, set access policies, and publish through a CLI or TypeScript SDK; the contracts handle identity, permissions, and revision history so there is no central point of failure to trust or migrate away from.

## Why Morse?

Traditional headless CMSs create several long-term constraints:

- **Trust concentration** - one vendor backend controls all identity and data
- **Weak portability** - publication identity and permissions don't travel with you
- **Opaque history** - change and authorization history is hidden inside a closed system
- **Vendor lock-in** - migrating requires re-building your backend from scratch

Morse solves these while keeping the ergonomics of headless CMS architecture. Publication identity is canonical on-chain. Write permissions are capability-based and verifiable. Every revision is auditable. And any team can integrate directly with the contracts, bypassing any specific service provider.

## System Architecture

Morse is composed of five layers. Only the contracts are the source of truth; all other layers are replaceable.

- **Control**: Sui Blockchain · Publication Registry · Collections · Entries & Revisions · OwnerCap / PublisherCap
- **Storage**: Walrus · Blob Storage · Quilt Storage
- **Access**: Seal · Publisher Policy · Allowlist Policy
- **Query**: Indexer · Content API
- **Develop**: TypeScript SDK · CLI

## Key Features

- **On-chain Permission Management** — Publication identity, write permissions, and state transitions are enforced by Move smart contracts - transparent and auditable.
- **Walrus Storage** — Content payloads and assets live in Walrus decentralized storage. Contracts store verifiable references, not bytes.
- **Capability-Based Auth** — OwnerCap and PublisherCap separate permission management from publishing. Revocation is instant and denylist-based.
- **Immutable Revisions** — Every content change is an appended revision. Draft and public heads enable editorial workflows without losing history.
- **Access Policies** — Public, publisher-gated, and subscription access policies control payload retrieval via Seal encryption.
- **Open Protocol** — Anyone can build integrations directly on contracts. Off-chain services are optional ergonomics, not gatekeepers.
- **Agent-First by Design** — A coding agent can provision publications, publish content, and operate the entire backend via CLI or SDK - no centralized provisioning required.

## Component Status

| Component | Status | Description |
| --- | --- | --- |
| **Move Contracts** | Active | Publication, collection, entry, and revision management. Deployed on Sui Testnet. |
| **TypeScript SDK** | Active | Wraps Sui, Walrus, and Seal behind a small adapter pattern. Published as `@arcadiasystems/morse-sdk` on npm (testnet). |
| **CLI** | Active | Terminal tool for managing publications, collections, and entries. Published as `@arcadiasystems/morse-cli` on npm (testnet). |
| **Indexer** | Planned | Listens to on-chain events and builds read-optimized state. |
| **Content API** | Planned | REST API for querying publications, collections, and entries. |

## Next Steps

- [Quick Start](https://morsecms-docs.vercel.app/quick-start.html): Choose your path - CLI, SDK, or contracts - and go from zero to published content on testnet.
- [Core Concepts](https://morsecms-docs.vercel.app/core-concepts.html): Understand the Publication → Collection → Entry model.
- [CLI](https://morsecms-docs.vercel.app/cli-overview.html): Manage publications and content from your terminal. Encrypted keystore, active context, no IDs to paste.
- [SDK](https://morsecms-docs.vercel.app/sdk-overview.html): Build on Morse from Node or the browser. Adapter pattern, branded IDs, structured errors.
