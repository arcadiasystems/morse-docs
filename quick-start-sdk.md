> Source: https://docs.morsecms.xyz/quick-start-sdk.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Quick Start: SDK

> Create a publication, add an entry, and read it back in one TypeScript script. Server-side with KeypairAdapter: no browser, no wallet popups. Want to see the result first? Browse the [live demo blog](https://morse-blog-demo.vercel.app) built on this SDK.

> **WARNING: Network status**
>
> Morse runs on **Walrus Mainnet and testnet**, and the contracts are **unaudited**. On mainnet, gas and Walrus storage cost real SUI and WAL, and there is no faucet. Test on testnet first, and read [Walrus Mainnet](https://docs.morsecms.xyz/mainnet.html) before you switch. Sui and Walrus testnets reset periodically (Walrus wipes every few months), so stored content and object IDs are lost on reset. Do not publish anything you cannot afford to lose.

## Prerequisites

| Requirement | Details | Purpose |
| --- | --- | --- |
| Bun or Node | v1.2+ / ≥ 18 | JavaScript runtime |
| SUI + WAL tokens | [SUI faucet](https://faucet.sui.io/) · [Swap SUI for WAL](https://stake-wal.wal.app/?network=testnet) | Gas fees (SUI) and Walrus storage fees (WAL) |
| Bech32 private key | A `suiprivkey1...` string | SDK authentication. Export from your wallet's settings |

## Installing

Install the SDK and its peer dependencies using your preferred package manager. See [SDK Client Setup → Compatibility](https://docs.morsecms.xyz/sdk-client-setup.html#compatibility) for compatible dependency versions.

```bash
bun add @arcadiasystems/morse-sdk @mysten/sui@2.16.2 @mysten/walrus@1.1.6 @mysten/seal@1.1.3
```

```bash
npm install @arcadiasystems/morse-sdk @mysten/sui@2.16.2 @mysten/walrus@1.1.6 @mysten/seal@1.1.3
```

```bash
yarn add @arcadiasystems/morse-sdk @mysten/sui@2.16.2 @mysten/walrus@1.1.6 @mysten/seal@1.1.3
```

`@mysten/sui` is a required peer dependency. `@mysten/walrus` is needed for the `DefaultWalrusWriteAdapter` used below. `@mysten/seal` is required at runtime even for non-encrypted workflows.

## Writing the script

Save this as `quickstart.ts`. It creates a publication, adds a collection, uploads an entry, and reads it back.

> **INFO: Transport: gRPC**
>
> This guide uses `SuiGrpcClient` from `@mysten/sui/grpc`; the SDK's client interfaces are typed against it. The JSON-RPC `SuiClient` from `@mysten/sui/client` is not supported; a JSON-RPC fallback is planned but has not shipped yet. See [SDK Client Setup](https://docs.morsecms.xyz/sdk-client-setup.html) for details.

```typescript
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  KeypairAdapter,
  morseConfig,
  RpcPublicationReader,
  createPublication,
  createCollection,
  addEntryFromBytes,
  DefaultWalrusWriteAdapter,
  HttpAggregatorReadAdapter,
} from "@arcadiasystems/morse-sdk";

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) throw new Error("Set PRIVATE_KEY to a suiprivkey1... Bech32 string");

// 1. Configure client and adapter
const config = morseConfig({ network: "testnet" });
const client = new SuiGrpcClient({
  network: "testnet",
  baseUrl: config.rpcUrl,
});
const keypair = Ed25519Keypair.fromSecretKey(privateKey);
const adapter = KeypairAdapter.fromSecretKey(privateKey, client);
const reader = RpcPublicationReader.fromMorseConfig(config, client);

// 2. Create a publication
const pub = await createPublication(adapter, config, {
  name: "My Publication",
  slug: `my-pub-${Date.now()}`, // slugs are globally unique on-chain
});
console.log("Publication:", pub.publicationId);

// 3. Add a collection
await createCollection(adapter, config, {
  publicationId: pub.publicationId,
  publisherCapId: pub.publisherCapId,
  name: "posts",
  storageMode: "blob",
});
console.log("Collection created: posts");

// 4. Upload and add an entry
const walrusWriter = DefaultWalrusWriteAdapter.fromConfig(
  { network: "testnet", suiClient: client },
  keypair,
);

const entry = await addEntryFromBytes(adapter, config, {
  walrus: walrusWriter,
  publicationId: pub.publicationId,
  publisherCapId: pub.publisherCapId,
  collectionName: "posts",
  name: "first-post",
  bytes: new TextEncoder().encode(
    JSON.stringify({ title: "Hello World", body: "My first post on Morse." })
  ),
  contentType: "application/json",
  upload: { epochs: 3, deletable: true },
});
console.log("Entry ID:", entry.entryId);

// 5. Read it back (metadata from Sui, content from Walrus)
const fetched = await reader.getEntry(
  pub.publicationId,
  "posts",
  entry.entryId,
);
console.log("Entry name:", fetched.name);
console.log("Revisions:", fetched.revisions.length);

const walrusReader = HttpAggregatorReadAdapter.fromMorseConfig(config, client);
const content = await walrusReader.readBlobRef(fetched.revisions[0].blobRef);
console.log(new TextDecoder().decode(content));
```

`HttpAggregatorReadAdapter` routes content reads through the Walrus aggregator, which is more reliable on testnet. See [SDK Client Setup → Picking a Walrus adapter](https://docs.morsecms.xyz/sdk-client-setup.html#picking-a-walrus-adapter) for alternatives.

> **TIP: Which IDs to save**
>
> The return values (`pub.publicationId`, `pub.publisherCapId`, `entry.entryId`) contain everything you need for subsequent calls. Log them or store them in your app's config.

## Running it

```bash
PRIVATE_KEY="suiprivkey1..." bun run quickstart.ts
```

With Node (requires `"type": "module"` in your `package.json` for top-level `await`):

```bash
PRIVATE_KEY="suiprivkey1..." npx tsx quickstart.ts
```

```output
Publication: 0x1a2b...3c4d
Collection created: posts
Entry ID: 0
Entry name: first-post
Revisions: 1
```

> **TIP: You are live on-chain**
>
> Your publication, collection, and entry are on Sui testnet. The entry content is stored on Walrus. For browser integration with wallet popups, see [SDK Client Setup → Browser](https://docs.morsecms.xyz/sdk-client-setup.html#browser-setup).

## Next steps

- [SDK: Client Setup](https://docs.morsecms.xyz/sdk-client-setup.html): Browser setup, wallet adapters, Walrus adapter options, and error handling.
- [SDK: Cookbooks](https://docs.morsecms.xyz/sdk-workflows.html): Encrypted entries, revisions, reading content, and the full publishing API.
- [Core Concepts](https://docs.morsecms.xyz/core-concepts.html): Understand the data model: publications, collections, entries, and revisions.
