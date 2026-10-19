> Source: https://docs.morsecms.xyz/quick-start.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Quick Start

> Choose the path that fits your workflow. Each guide takes you from zero to published content on testnet.

> **INFO: New to Morse?**
>
> Start with [Core Concepts](https://docs.morsecms.xyz/core-concepts.html) for an overview, or jump straight into the CLI guide. It is the fastest way to see Morse in action.

- [CLI](https://docs.morsecms.xyz/quick-start-cli.html): Install morse-cli from npm, create a publication, publish and read content, all from your terminal. For operators and content managers. *(~5 min · Bun or Node · funded Sui wallet)*
- [TypeScript SDK](https://docs.morsecms.xyz/quick-start-sdk.html): Wire up @arcadiasystems/morse-sdk, create a publication, add an entry and read it back in a single script. For app developers building on Morse. *(~5 min · Bun or Node · funded Sui wallet)*
- [Smart Contracts](https://docs.morsecms.xyz/quick-start-contracts.html): Interact with Morse's deployed contracts directly via PTBs. For developers who want full control over transaction construction. *(~10 min · Sui CLI · funded Sui wallet)*

## Every path needs a funded testnet wallet

All three guides sign transactions on Sui testnet and store content on Walrus testnet. You need SUI for gas and WAL for storage. Both are free and take about two minutes.

| Step | Where | Why |
| --- | --- | --- |
| 1. Install a wallet | Sui Wallet, Suiet, or any Sui-compatible wallet | Holds your key and signs transactions |
| 2. Get testnet SUI | [faucet.sui.io](https://faucet.sui.io/) | Gas for every on-chain action |
| 3. Swap some SUI for WAL | [stake-wal.wal.app](https://stake-wal.wal.app/?network=testnet) | Walrus storage fees when you publish |

> **WARNING: Testnet first**
>
> Testnets reset periodically. Testnet tokens have no monetary value. Morse also runs on Walrus Mainnet, where gas and storage cost real SUI and WAL and there is no faucet. Run each guide on testnet before you try mainnet.
