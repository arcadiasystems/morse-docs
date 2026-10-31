> Source: https://docs.morsecms.xyz/quick-start-contracts.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Quick Start: Smart Contracts

> Create a publication, add a collection, and publish an entry using raw Programmable Transaction Blocks against the deployed Morse contracts on testnet. No SDK wrappers, just `tx.moveCall`.

> **WARNING: Network status**
>
> Morse runs on **Walrus Mainnet and testnet**. On mainnet, gas and Walrus storage cost real SUI and WAL, and there is no faucet. Test on testnet first, and read [Walrus Mainnet](https://docs.morsecms.xyz/mainnet.html) before you switch. Sui and Walrus testnets reset periodically (Walrus wipes every few months), so stored content and object IDs are lost on reset. Do not publish anything you cannot afford to lose.

## Prerequisites

| Requirement | Details | Purpose |
| --- | --- | --- |
| Bun or Node | v1.2+ / ≥ 18 | JavaScript runtime |
| SUI + WAL tokens | [SUI faucet](https://faucet.sui.io/) · [Swap SUI for WAL](https://stake-wal.wal.app/?network=testnet) | Gas fees (SUI) and Walrus storage fees (WAL) |
| Bech32 private key | A `suiprivkey1...` string | Transaction signing. Export from your wallet's settings |

## Installing

Install the Morse SDK (for network configuration and Walrus uploads) and the Sui SDK (for transaction construction and signing). The `@mysten/*` peers are pinned to the exact versions the SDK accepts: it takes one `@mysten/walrus` and one `@mysten/seal` release, because a later patch of either can need a newer `@mysten/sui` than the SDK supports.

```bash
bun add @arcadiasystems/morse-sdk@~0.11.0 @mysten/sui@2.38.0 @mysten/walrus@1.2.37 @mysten/seal@1.5.2
```

```bash
npm install @arcadiasystems/morse-sdk@~0.11.0 @mysten/sui@2.38.0 @mysten/walrus@1.2.37 @mysten/seal@1.5.2
```

> **INFO: Why the SDK if we are using raw PTBs?**
>
> This guide uses raw `tx.moveCall`. No SDK wrappers for contract calls. The SDK packages provide three things:  `morseConfig`: resolves the deployed package ID, registry ID, and RPC URL so you do not hard-code addresses `DefaultWalrusWriteAdapter`: handles blob uploads to Walrus (requires `@mysten/walrus`) `DefaultSealAdapter`: handles Seal encryption (requires `@mysten/seal`, loaded at runtime even for non-encrypted workflows)  For the high-level wrapper approach, see the [SDK Quick Start](https://docs.morsecms.xyz/quick-start-sdk.html).

## Writing the script

Save this as `quickstart-contracts.ts`. It creates a publication, adds a collection, uploads content to Walrus, and registers an on-chain entry, all using raw PTBs.

> **INFO: Transport: gRPC**
>
> This guide uses `SuiGrpcClient` for its typed interface and lower latency. The Morse SDK is gRPC-only: its readers and adapters are typed against `SuiGrpcClient` from `@mysten/sui/grpc`, and it makes no JSON-RPC calls. Environments that block gRPC must proxy through a gRPC-compatible RPC endpoint. See [SDK Client Setup](https://docs.morsecms.xyz/sdk-client-setup.html) for details.

```typescript
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { bcs } from "@mysten/sui/bcs";
import { morseConfig, DefaultWalrusWriteAdapter } from "@arcadiasystems/morse-sdk";

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) throw new Error("Set PRIVATE_KEY to a suiprivkey1... Bech32 string");

// ---------------------------------------------------------------------------
// 1. Configure client, keypair, and Walrus adapter
// ---------------------------------------------------------------------------
const config = morseConfig({ network: "testnet" });
const PACKAGE_ID = config.packageId;
const REGISTRY_ID = config.registryId;

const client = new SuiGrpcClient({
  network: "testnet",
  baseUrl: config.rpcUrl,
});
const keypair = Ed25519Keypair.fromSecretKey(privateKey);
const walrusWriter = DefaultWalrusWriteAdapter.fromConfig(
  { network: "testnet", suiClient: client },
  keypair,
);

// ---------------------------------------------------------------------------
// 2. Create a publication
//    new_publication returns (Publication, OwnerCap, PublisherCap).
//    Share the publication and transfer the caps in the same PTB.
// ---------------------------------------------------------------------------
const pubTx = new Transaction();

const created = pubTx.moveCall({
  target: `${PACKAGE_ID}::publication::new_publication`,
  arguments: [
    pubTx.object(REGISTRY_ID),
    pubTx.pure.string("My Blog"),
    pubTx.pure.string(`my-blog-${Date.now()}`), // slugs are globally unique on-chain
  ],
});

// Share the publication so other transactions can reference it.
pubTx.moveCall({
  target: `${PACKAGE_ID}::publication::share_publication`,
  arguments: [created[0]],
});

// Transfer caps using typed wrappers (key-only objects can't use transferObjects).
pubTx.moveCall({
  target: `${PACKAGE_ID}::publication::transfer_owner_cap`,
  arguments: [created[1], pubTx.pure.address(keypair.toSuiAddress())],
});
pubTx.moveCall({
  target: `${PACKAGE_ID}::publication::transfer_publisher_cap`,
  arguments: [created[2], pubTx.pure.address(keypair.toSuiAddress())],
});

const pubResult = await client.signAndExecuteTransaction({
  transaction: pubTx,
  signer: keypair,
  include: { effects: true, objectTypes: true },
});

// Extract created object IDs from transaction effects.
const { effects, objectTypes } = pubResult.Transaction;
const createdObjects = effects.changedObjects
  .filter((c) => c.idOperation === "Created" && objectTypes?.[c.objectId])
  .map((c) => ({ objectId: c.objectId, type: objectTypes[c.objectId] }));

const PUBLICATION_ID = createdObjects.find((o) => o.type.includes("Publication"))!.objectId;
const OWNER_CAP_ID = createdObjects.find((o) => o.type.includes("OwnerCap"))!.objectId;
const PUBLISHER_CAP_ID = createdObjects.find((o) => o.type.includes("PublisherCap"))!.objectId;

console.log("Publication:", PUBLICATION_ID);
console.log("OwnerCap:", OWNER_CAP_ID);
console.log("PublisherCap:", PUBLISHER_CAP_ID);

// Wait for the transaction to be indexed before referencing the new objects.
await client.waitForTransaction({ digest: pubResult.Transaction.digest });

// ---------------------------------------------------------------------------
// 3. Add a collection
//    Blob mode (storage_mode = 0): each entry holds a standalone Walrus Blob.
// ---------------------------------------------------------------------------
const colTx = new Transaction();

colTx.moveCall({
  target: `${PACKAGE_ID}::publication::create_collection`,
  arguments: [
    colTx.object(PUBLICATION_ID),
    colTx.object(PUBLISHER_CAP_ID),
    colTx.pure.string("posts"),
    colTx.pure.u8(0),  // STORAGE_MODE_BLOB
  ],
});

const colResult = await client.signAndExecuteTransaction({ transaction: colTx, signer: keypair });
console.log("Collection created: posts");

// Wait for the collection transaction to be indexed before modifying the publication again.
await client.waitForTransaction({ digest: colResult.Transaction.digest });

// ---------------------------------------------------------------------------
// 4. Upload content to Walrus and add an entry
//    Upload returns the Blob *object* ID (a Sui object reference).
//    Pass it via tx.object()  - the contract takes &Blob, not the hash.
// ---------------------------------------------------------------------------
const content = new TextEncoder().encode(
  JSON.stringify({ title: "Hello World", body: "My first post on Morse." })
);
const { blobObjectId: BLOB_OBJECT_ID } = await walrusWriter.uploadBlob(content, {
  epochs: 3,
  deletable: true,
});
console.log("Blob uploaded:", BLOB_OBJECT_ID);

// BCS-encode Option<vector<u8>>::None for quilt_patch_id and seal_id.
const optionNone = bcs.option(bcs.vector(bcs.u8())).serialize(null).toBytes();

const entryTx = new Transaction();

entryTx.moveCall({
  target: `${PACKAGE_ID}::publication::add_entry_to_collection`,
  arguments: [
    entryTx.object(PUBLICATION_ID),     // &mut Publication
    entryTx.object(PUBLISHER_CAP_ID),   // &PublisherCap
    entryTx.pure.string("posts"),       // collection name
    entryTx.pure.string("hello-world"),  // entry name
    entryTx.object(BLOB_OBJECT_ID),     // blob: &Blob (must be deletable)
    entryTx.pure(optionNone),           // quilt_patch_id: None (blob mode)
    entryTx.pure.string("application/json"), // content type
    entryTx.pure.bool(false),           // encrypted: false
    entryTx.pure.u8(0),                // access_policy: PUBLIC
    entryTx.pure(optionNone),           // seal_id: None
  ],
});

await client.signAndExecuteTransaction({ transaction: entryTx, signer: keypair });
console.log("Entry added: hello-world (ID 0)");
```

> **TIP: Which IDs to save**
>
> Save the Publication, OwnerCap, and PublisherCap object IDs from the output; you need them for all subsequent contract calls. You can also recover the publication ID from its slug using `get_publication_id_by_slug` on the registry.

## Running it

```bash
PRIVATE_KEY="suiprivkey1..." bun run quickstart-contracts.ts
```

```output
Publication: 0x1a2b...3c4d
OwnerCap: 0x5e6f...7a8b
PublisherCap: 0x9c0d...1e2f
Collection created: posts
Blob uploaded: 0x4d5e...6f7a
Entry added: hello-world (ID 0)
```

> **TIP: You are live on-chain**
>
> Your publication, collection, and entry are on Sui testnet. The entry content is stored on Walrus. For a friendlier reading experience, use the [Morse CLI](https://docs.morsecms.xyz/quick-start-cli.html): `morse entry read 0`.

## Next steps

- [Contract Cookbooks](https://docs.morsecms.xyz/contracts-workflows.html): Revisions, drafts, encrypted content, delegating access, and teardown, all via raw PTBs.
- [Contract Reference](https://docs.morsecms.xyz/contracts-reference.html): Full function signatures, argument types, error codes, and Move struct definitions.
- [Core Concepts](https://docs.morsecms.xyz/core-concepts.html): Understand the data model: publications, collections, entries, and revisions.
