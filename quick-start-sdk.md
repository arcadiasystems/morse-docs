> Source: https://morse-docs.vercel.app/quick-start-sdk.html · Full docs: https://morse-docs.vercel.app/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/MandaWeb3/morse-docs/issues/new?labels=docs-feedback

# Quick Start: SDK

> Create a publication, add an entry, and read it back in one TypeScript script. Server-side with KeypairAdapter - no browser, no wallet popups.

## Prerequisites

| Requirement | Details | Purpose |
| --- | --- | --- |
| Bun or Node | v1.2+ / >= 18 | JavaScript runtime |
| SUI + WAL tokens | [SUI faucet](https://faucet.sui.io/) / [Swap SUI for WAL](https://stake-wal.wal.app/?network=testnet) | Gas fees (SUI) and Walrus storage fees (WAL) |
| Bech32 private key | A `suiprivkey1...` string | SDK authentication - export from your wallet's settings |

## Installing

Install the SDK and its peer dependencies using your preferred package manager. See [SDK Client Setup → Compatibility](https://morse-docs.vercel.app/sdk-client-setup.html#compatibility) for compatible dependency versions.

With Bun:

```bash
bun add @arcadiasystems/morse-sdk @mysten/sui @mysten/walrus @mysten/seal
```

Or with npm:

```bash
npm install @arcadiasystems/morse-sdk @mysten/sui @mysten/walrus @mysten/seal
```

Or with Yarn:

```bash
yarn add @arcadiasystems/morse-sdk @mysten/sui @mysten/walrus @mysten/seal
```

`@mysten/sui` is a required peer dependency. `@mysten/walrus` is needed for the `DefaultWalrusWriteAdapter` used below. `@mysten/seal` is required at runtime even for non-encrypted workflows.

## Writing the Script

Save this as `quickstart.ts`. It creates a publication, adds a collection, uploads an entry, and reads it back.

> **INFO: Transport: gRPC**
>
> This guide uses `SuiGrpcClient` for its typed interface and lower latency. Morse SDK also supports JSON-RPC via `SuiHTTPTransport` from `@mysten/sui/client` if your environment requires it - see [SDK Client Setup](https://morse-docs.vercel.app/sdk-client-setup.html) for details.

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
  slug: "my-publication",
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

`HttpAggregatorReadAdapter` routes content reads through the Walrus aggregator, which is more reliable on testnet. See [SDK Client Setup → Picking a Walrus Adapter](https://morse-docs.vercel.app/sdk-client-setup.html#picking-a-walrus-adapter) for alternatives.

> **TIP: Which IDs to save**
>
> The return values (`pub.publicationId`, `pub.publisherCapId`, `entry.entryId`) contain everything you need for subsequent calls. Log them or store them in your app's config.

## Running It

With Bun:

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

> **TIP: You're live on-chain**
>
> Your publication, collection, and entry are on Sui testnet. The entry content is stored on Walrus. For browser integration with wallet popups, see [SDK Client Setup -> Browser](https://morse-docs.vercel.app/sdk-client-setup.html#browser-setup).

## Next Steps

- [SDK: Client Setup](https://morse-docs.vercel.app/sdk-client-setup.html): Browser setup, wallet adapters, Walrus adapter options, and error handling.
- [SDK: Cookbooks](https://morse-docs.vercel.app/sdk-workflows.html): Encrypted entries, revisions, reading content, and the full publishing API.
- [Core Concepts](https://morse-docs.vercel.app/core-concepts.html): Understand the data model - publications, collections, entries, and revisions.
