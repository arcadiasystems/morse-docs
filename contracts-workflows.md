> Source: https://docs.morsecms.xyz/contracts-workflows.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/MandaWeb3/morse-docs/issues/new?labels=docs-feedback

# Contract Cookbooks

> End-to-end recipes for interacting with Morse smart contracts directly via Sui Programmable Transaction Blocks (PTBs). Each recipe shows the raw `tx.moveCall` pattern using `@mysten/sui/transactions`. For the high-level SDK wrappers, see [SDK Cookbooks](https://docs.morsecms.xyz/sdk-workflows.html). For the full function reference, see [Contract Reference](https://docs.morsecms.xyz/contracts-reference.html).

## Prerequisites

| Requirement | Details | Purpose |
| --- | --- | --- |
| Bun or Node | v1.2+ / >= 18 | JavaScript runtime |
| SUI + WAL tokens | [SUI faucet](https://faucet.sui.io/) / [Swap SUI for WAL](https://stake-wal.wal.app/?network=testnet) | Gas fees (SUI) and Walrus storage fees (WAL) |
| Bech32 private key | A `suiprivkey1...` string | Transaction signing - export from your wallet's settings |
| Morse SDK | `@arcadiasystems/morse-sdk` | Provides `morseConfig()` for package ID, registry ID, and RPC URL |

Make sure the SDK and its peer dependencies are installed before continuing. See [SDK Setup](https://docs.morsecms.xyz/sdk-client-setup.html) for the install command.

## Setup

All recipes below assume the following imports and configuration are in scope. For browser environments, replace `Ed25519Keypair` with a wallet signer.

> **INFO: Why the SDK imports?**
>
> Contract calls are raw `tx.moveCall` with no SDK wrappers. The SDK is only used for configuration and adapters: `morseConfig()` resolves deployed addresses, `DefaultWalrusWriteAdapter` uploads blobs, and `DefaultSealAdapter` handles encryption. See [SDK Client Setup](https://docs.morsecms.xyz/sdk-client-setup.html) for details.

```typescript
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { bcs } from "@mysten/sui/bcs";
import { morseConfig, DefaultWalrusWriteAdapter, DefaultSealAdapter } from "@arcadiasystems/morse-sdk";

// Resolve package ID, registry ID, and RPC endpoint for testnet
const config = morseConfig({ network: "testnet" });
const PACKAGE_ID = config.packageId;
const REGISTRY_ID = config.registryId;

const client = new SuiGrpcClient({
  network: "testnet",
  baseUrl: config.rpcUrl,
});
const keypair = Ed25519Keypair.fromSecretKey("<your-private-key>");
// Second keypair for delegated write-access examples
const coAuthorKeypair = Ed25519Keypair.fromSecretKey("<co-author-private-key>");
const walrusWriter = DefaultWalrusWriteAdapter.fromConfig(
  { network: "testnet", suiClient: client },
  keypair,
);
// Empty {} uses the default key-server list from config
const seal = DefaultSealAdapter.fromMorseConfig(config, {}, client);
```

> **INFO: Run each recipe as a separate script**
>
> Each code block is a standalone script. Running multiple blocks in the same process can cause stale object version errors because the SDK caches object versions between transactions. To avoid this, run each block as its own script or combine operations into a single PTB.

## Creating a Publication

Creates a publication, shares it, and transfers the resulting capabilities to the caller in one atomic PTB. `new_publication` returns a tuple - destructure it as three separate transaction results. The slug is globally unique and immutable after creation.

> **WARNING: OwnerCap and PublisherCap are `key`-only**
>
> Both caps lack the `store` ability and cannot be moved with `tx.transferObjects`. Use the contract's typed transfer wrappers `transfer_owner_cap` and `transfer_publisher_cap` instead.

```typescript
const tx = new Transaction();

// new_publication returns (Publication, OwnerCap, PublisherCap).
const created = tx.moveCall({
  target: `${PACKAGE_ID}::publication::new_publication`,
  arguments: [
    tx.object(REGISTRY_ID),
    tx.pure.string("My Blog"),
    tx.pure.string("my-blog"),
  ],
});
const publicationArg  = created[0];
const ownerCapArg     = created[1];
const publisherCapArg = created[2];

// Share the publication so other transactions can access it.
tx.moveCall({
  target: `${PACKAGE_ID}::publication::share_publication`,
  arguments: [publicationArg],
});

// Transfer caps using the contract's typed wrappers (key-only objects).
tx.moveCall({
  target: `${PACKAGE_ID}::publication::transfer_owner_cap`,
  arguments: [ownerCapArg, tx.pure.address(keypair.toSuiAddress())],
});
tx.moveCall({
  target: `${PACKAGE_ID}::publication::transfer_publisher_cap`,
  arguments: [publisherCapArg, tx.pure.address(keypair.toSuiAddress())],
});

const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
  include: { effects: true, objectTypes: true },
});

// Extract created object IDs from the transaction effects.
const { effects, objectTypes } = result.Transaction;
const createdObjects = effects.changedObjects
  .filter((c) => c.idOperation === "Created" && objectTypes?.[c.objectId])
  .map((c) => ({ objectId: c.objectId, type: objectTypes[c.objectId] }));

console.log("Created objects:", createdObjects);
```

See also: [SDK Cookbooks → Creating a Publication](https://docs.morsecms.xyz/sdk-workflows.html#creating-a-publication)

## Adding a Collection

Collections are added to an existing publication. The storage mode is immutable after creation: `0` for blob mode and `1` for quilt mode. Use blob mode for growing content like posts; use quilt mode for small, rarely-changing content like config files.

```typescript
const PUBLISHER_CAP_ID = "0xPUBLISHER_CAP_ID";

const tx = new Transaction();

// Blob mode (storage_mode = 0): each entry holds a standalone Walrus Blob object ID.
tx.moveCall({
  target: `${PACKAGE_ID}::publication::create_collection`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(PUBLISHER_CAP_ID),
    tx.pure.string("posts"),
    tx.pure.u8(0), // STORAGE_MODE_BLOB
  ],
});

// Quilt mode (storage_mode = 1): entries are addressed by 37-byte QuiltPatchId.
tx.moveCall({
  target: `${PACKAGE_ID}::publication::create_collection`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(PUBLISHER_CAP_ID),
    tx.pure.string("config"),
    tx.pure.u8(1), // STORAGE_MODE_QUILT
  ],
});

// A blob-mode collection for encrypted content (used in the Encrypted Content section below).
tx.moveCall({
  target: `${PACKAGE_ID}::publication::create_collection`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(PUBLISHER_CAP_ID),
    tx.pure.string("secret-blog"),
    tx.pure.u8(0), // STORAGE_MODE_BLOB
  ],
});

await client.signAndExecuteTransaction({ transaction: tx, signer: keypair });
```

See also: [SDK Cookbooks → Adding a Collection](https://docs.morsecms.xyz/sdk-workflows.html#adding-a-collection)

## Adding an Entry

Upload content to Walrus first, then pass the resulting Blob object ID to `add_entry_to_collection`. The `blob` argument is a reference to a Walrus Blob Sui object (`&Blob`), not a blob ID hash. Only deletable blobs are accepted. For blob-mode collections, pass `None` for `quilt_patch_id` using BCS serialization as shown below.

```typescript
const content = new TextEncoder().encode(
  JSON.stringify({ title: "My First Post", body: "Hello from Morse." })
);
const { blobObjectId: BLOB_OBJECT_ID } = await walrusWriter.uploadBlob(content, {
  epochs: 3,
  deletable: true,
});

// BCS-encode Option<vector<u8>>::None for quilt_patch_id and seal_id.
const optionNone = bcs.option(bcs.vector(bcs.u8())).serialize(null).toBytes();

const tx = new Transaction();
const entryId = tx.moveCall({
  target: `${PACKAGE_ID}::publication::add_entry_to_collection`,
  arguments: [
    tx.object(PUBLICATION_ID),     // &mut Publication
    tx.object(PUBLISHER_CAP_ID),   // &PublisherCap
    tx.pure.string("posts"),       // collection_name: String
    tx.pure.string("my-first-post"), // name: String
    tx.object(BLOB_OBJECT_ID),     // blob: &Blob (must be deletable)
    tx.pure(optionNone),           // quilt_patch_id: Option<vector<u8>> = None
    tx.pure.string("text/plain"),  // content_type: String
    tx.pure.bool(false),           // encrypted: bool
    tx.pure.u8(0),                // access_policy: u8  - 0 = PUBLIC
    tx.pure(optionNone),           // seal_id: Option<vector<u8>> = None
  ],
});
// entryId is the returned u64  - the stable monotonic ID for this entry (0, 1, 2, ...).
await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
  include: { events: true },
});
```

See also: [SDK Cookbooks → Adding an Entry](https://docs.morsecms.xyz/sdk-workflows.html#adding-an-entry)

## Publishing a New Revision

Revisions are appended to an existing entry. Two paths are available: publish directly in one call, or stage a draft first and promote it.

### Option A: Publish Direct

Append a non-encrypted public revision in a single call, bypassing the draft stage. Advances `public_head` immediately.

```typescript
const ENTRY_ID = 0; // u64 entry ID returned by add_entry_to_collection

const updatedContent = new TextEncoder().encode(
  JSON.stringify({ title: "My First Post", body: "Updated content." })
);
const { blobObjectId: NEW_BLOB_ID } = await walrusWriter.uploadBlob(updatedContent, {
  epochs: 3,
  deletable: true,
});
const optionNone = bcs.option(bcs.vector(bcs.u8())).serialize(null).toBytes();

const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::publication::publish_collection_entry_direct`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(PUBLISHER_CAP_ID),
    tx.pure.string("posts"),
    tx.pure.u64(ENTRY_ID),
    tx.object(NEW_BLOB_ID),   // blob: &Blob
    tx.pure(optionNone),      // quilt_patch_id: None
    tx.pure.string("text/plain"),
  ],
});
await client.signAndExecuteTransaction({ transaction: tx, signer: keypair });
```

### Option B: Draft Then Publish

Stage a draft revision first (advances `draft_head` only), then promote it to a public revision. The published revision takes a fresh blob - `draft_revision_id` is used only to validate the draft exists on-chain.

```typescript
const ENTRY_ID = 0; // u64 entry ID returned by add_entry_to_collection

const draftContent = new TextEncoder().encode(JSON.stringify({ title: "Draft", body: "WIP" }));
const { blobObjectId: DRAFT_BLOB_ID } = await walrusWriter.uploadBlob(draftContent, {
  epochs: 3, deletable: true,
});

const finalContent = new TextEncoder().encode(JSON.stringify({ title: "Final", body: "Done" }));
const { blobObjectId: FINAL_BLOB_ID } = await walrusWriter.uploadBlob(finalContent, {
  epochs: 3, deletable: true,
});

const optionNone = bcs.option(bcs.vector(bcs.u8())).serialize(null).toBytes();

const tx = new Transaction();

// Step 1: append a draft revision (advances draft_head, does not touch public_head).
const draftRevisionId = tx.moveCall({
  target: `${PACKAGE_ID}::publication::append_collection_entry_draft_revision`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(PUBLISHER_CAP_ID),
    tx.pure.string("posts"),
    tx.pure.u64(ENTRY_ID),
    tx.object(DRAFT_BLOB_ID),  // blob: &Blob
    tx.pure(optionNone),       // quilt_patch_id: None
    tx.pure.string("text/plain"),
    tx.pure.bool(false),       // encrypted
    tx.pure.u8(0),            // access_policy: PUBLIC
    tx.pure(optionNone),       // seal_id: None
  ],
});

// Step 2: promote the draft to a public revision in the same PTB.
tx.moveCall({
  target: `${PACKAGE_ID}::publication::publish_collection_entry_from_draft`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(PUBLISHER_CAP_ID),
    tx.pure.string("posts"),
    tx.pure.u64(ENTRY_ID),
    draftRevisionId,            // chain the return value from step 1
    tx.object(FINAL_BLOB_ID),  // blob: &Blob for the published revision
    tx.pure(optionNone),       // quilt_patch_id: None
    tx.pure.string("text/plain"),
  ],
});

await client.signAndExecuteTransaction({ transaction: tx, signer: keypair });
```

See also: [SDK Cookbooks → Publishing a New Revision](https://docs.morsecms.xyz/sdk-workflows.html#publishing-a-new-revision)

## Encrypted Content

Encrypted entries require `encrypted=true`, `access_policy=1` (Publisher), and a Seal identity in `seal_id`. Encrypt content with [Seal](https://docs.seal.mystenlabs.com/) first, then upload the ciphertext to Walrus. The Seal identity is a `vector<u8>`: `[publication_id_bytes (32)] || [0x01] || [nonce]`. Each entry should use a fresh nonce.

```typescript
// Build a Seal identity: publication ID bytes (32) || policy tag 0x01 || nonce.
function buildPublisherSealId(publicationId: string, nonce: Uint8Array): Uint8Array {
  // publicationId is a 0x-prefixed hex string; strip and decode to 32 bytes.
  const hex = publicationId.startsWith("0x") ? publicationId.slice(2) : publicationId;
  const idBytes = new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const result = new Uint8Array(idBytes.length + 1 + nonce.length);
  result.set(idBytes, 0);
  result[idBytes.length] = 0x01; // SEAL_POLICY_TAG_PUBLISHER
  result.set(nonce, idBytes.length + 1);
  return result;
}

const nonce  = crypto.getRandomValues(new Uint8Array(16));
const sealId = buildPublisherSealId(PUBLICATION_ID, nonce);

// BCS-encode Option<vector<u8>>::Some(sealId) and Option::None.
const sealIdOption = bcs.option(bcs.vector(bcs.u8())).serialize([...sealId]).toBytes();
const optionNone   = bcs.option(bcs.vector(bcs.u8())).serialize(null).toBytes();

// Encrypt plaintext with Seal using the sealId above.
const plaintext = new TextEncoder().encode("secret content");
const { ciphertext } = await seal.encrypt(plaintext, { sealId });
const { blobObjectId: ENCRYPTED_BLOB_ID } = await walrusWriter.uploadBlob(ciphertext, {
  epochs: 3, deletable: true,
});

const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::publication::add_entry_to_collection`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(PUBLISHER_CAP_ID),
    tx.pure.string("secret-blog"),
    tx.pure.string("private-post"),
    tx.object(ENCRYPTED_BLOB_ID),  // blob: &Blob holding the ciphertext
    tx.pure(optionNone),           // quilt_patch_id: None
    tx.pure.string("application/octet-stream"),
    tx.pure.bool(true),            // encrypted: true
    tx.pure.u8(1),               // access_policy: 1 = PUBLISHER
    tx.pure(sealIdOption),         // seal_id: Some(sealId)
  ],
});
await client.signAndExecuteTransaction({ transaction: tx, signer: keypair });
```

> **WARNING: Encrypted entries are always created as drafts**
>
> The publish functions hardcode `encrypted=false` on the public path - they cannot promote encrypted content to a public head. Read encrypted entries via `seal.decrypt` using the `sealId` stored in the revision metadata.

See also: [SDK Cookbooks → Encrypted Content](https://docs.morsecms.xyz/sdk-workflows.html#encrypted-content)

## Delegating Write Access

The owner issues `PublisherCap` objects to grant write access to co-authors. Revocation adds the cap ID to an on-chain denylist; all subsequent writes using that cap abort with `EPublisherCapRevoked`. See [Access Control](https://docs.morsecms.xyz/access-control.html) for the full capability model.

### Issuing a PublisherCap

Only the `OwnerCap` holder can issue new caps. The cap's `holder` field is fixed at issuance - the bound address is what grants write rights, not object ownership.

```typescript
const PUBLICATION_ID = "0xPUBLICATION_ID";
const OWNER_CAP_ID   = "0xOWNER_CAP_ID";
const HOLDER_ADDRESS = "0xCO_AUTHOR_ADDRESS";

const tx = new Transaction();

// issue_publisher_cap returns the new PublisherCap.
const newCap = tx.moveCall({
  target: `${PACKAGE_ID}::publication::issue_publisher_cap`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(OWNER_CAP_ID),
    tx.pure.address(HOLDER_ADDRESS),
  ],
});

// Transfer the cap to the co-author using the typed wrapper (key-only object).
tx.moveCall({
  target: `${PACKAGE_ID}::publication::transfer_publisher_cap`,
  arguments: [newCap, tx.pure.address(HOLDER_ADDRESS)],
});

const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
  include: { effects: true, objectTypes: true },
});

const { effects, objectTypes } = result.Transaction;
const publisherCapId = effects.changedObjects
  .find((c) => c.idOperation === "Created" && objectTypes?.[c.objectId]?.includes("PublisherCap"))
  ?.objectId;

console.log("Issued PublisherCap:", publisherCapId);
```

> **WARNING: Holder binding is immutable**
>
> The `holder` address is baked in at issuance. Transferring the cap object to a different address does not grant write rights to the new holder. To rotate authority, destroy the old cap and issue a fresh one bound to the new address.

### Revoking a PublisherCap

Revocation adds the cap's ID to an on-chain denylist. The physical object is not consumed - only the cap's ID is passed via `tx.pure.id`. The holder retains the object but any subsequent write attempt aborts with `EPublisherCapRevoked`.

```typescript
const PUBLISHER_CAP_ID_TO_REVOKE = "0xCAP_ID";

const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::publication::revoke_publisher_cap`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(OWNER_CAP_ID),
    tx.pure.id(PUBLISHER_CAP_ID_TO_REVOKE), // ID only, not the object itself
  ],
});
await client.signAndExecuteTransaction({ transaction: tx, signer: keypair });
```

### Destroying a PublisherCap

The cap holder voluntarily surrenders write access. Only the address bound as `holder` at issuance can call this. If the cap was previously revoked, destroying it also removes the entry from the denylist (storage cleanup).

```typescript
const MY_PUBLISHER_CAP_ID = "0xPUBLISHER_CAP_ID";

const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::publication::destroy_publisher_cap`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(MY_PUBLISHER_CAP_ID),
  ],
});
// Signed by the co-author (holder), not the publication owner.
await client.signAndExecuteTransaction({ transaction: tx, signer: coAuthorKeypair });
```

See also: [SDK Cookbooks → Delegating Write Access](https://docs.morsecms.xyz/sdk-workflows.html#delegating-write-access)

## Transferring Ownership

Transfer the `OwnerCap` to a new address. The recipient gains full governance rights: issuing and revoking publisher caps, deleting the publication, and transferring ownership again. Because `OwnerCap` is `key`-only (no `store`), you must use the typed `transfer_owner_cap` wrapper - `tx.transferObjects` will not work.

```typescript
const NEW_OWNER = "0xNEW_OWNER_ADDRESS";

const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::publication::transfer_owner_cap`,
  arguments: [
    tx.object(OWNER_CAP_ID),
    tx.pure.address(NEW_OWNER),
  ],
});
await client.signAndExecuteTransaction({ transaction: tx, signer: keypair });
```

> **WARNING: One-way for the sender**
>
> Once transferred, the original owner loses all governance rights immediately. The new owner could transfer back, but there is no built-in undo.

See also: [SDK Cookbooks → Transferring Ownership](https://docs.morsecms.xyz/sdk-workflows.html#transferring-ownership)

## Deleting and Tearing Down

Deletion is strictly bottom-up. The Move layer enforces this: `delete_collection` calls `table::destroy_empty` on the entries table and aborts if any entries remain. `delete_publication` calls `collections.destroy_empty()` and aborts if any collections remain. Entry IDs are permanently retired on deletion and never reused.

### Delete Entries

```typescript
// Delete all entries from both collections in a single PTB.
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::publication::delete_entry_from_collection`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(PUBLISHER_CAP_ID),
    tx.pure.string("posts"),
    tx.pure.u64(0),
  ],
});
tx.moveCall({
  target: `${PACKAGE_ID}::publication::delete_entry_from_collection`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(PUBLISHER_CAP_ID),
    tx.pure.string("secret-blog"),
    tx.pure.u64(0),
  ],
});
await client.signAndExecuteTransaction({ transaction: tx, signer: keypair });
```

### Delete a Collection

The collection must be empty (all entries deleted) before this call succeeds.

```typescript
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::publication::delete_collection`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(PUBLISHER_CAP_ID),
    tx.pure.string("posts"),
  ],
});
tx.moveCall({
  target: `${PACKAGE_ID}::publication::delete_collection`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(PUBLISHER_CAP_ID),
    tx.pure.string("config"),
  ],
});
tx.moveCall({
  target: `${PACKAGE_ID}::publication::delete_collection`,
  arguments: [
    tx.object(PUBLICATION_ID),
    tx.object(PUBLISHER_CAP_ID),
    tx.pure.string("secret-blog"),
  ],
});
await client.signAndExecuteTransaction({ transaction: tx, signer: keypair });
```

### Delete a Publication

Requires the `OwnerCap`. All collections must be deleted first. Both the publication object and the `OwnerCap` are consumed. The slug is released from the registry and becomes available for reuse.

```typescript
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::publication::delete_publication`,
  arguments: [
    tx.object(REGISTRY_ID),
    tx.object(PUBLICATION_ID),
    tx.object(OWNER_CAP_ID),
  ],
});
await client.signAndExecuteTransaction({ transaction: tx, signer: keypair });
```

See also: [SDK Cookbooks → Deleting and Tearing Down](https://docs.morsecms.xyz/sdk-workflows.html#deleting-and-tearing-down)

## Troubleshooting

Move aborts surface as `MoveAbort` errors in the RPC response with a module name and numeric code. The table below maps the most common codes to their cause.

| Code | Error | Module | Cause |
| --- | --- | --- | --- |
| `6` | `ESlugAlreadyExists` | `publication` | A publication with that slug already exists in the registry. |
| `2` | `EUnauthorized` | `publication` | The cap's `publication_id` does not match the publication object passed in the call. |
| `4` | `EPublisherCapWrongHolder` | `publication` | The transaction sender does not match `cap.holder`. |
| `5` | `EPublisherCapRevoked` | `publication` | The cap ID is on the publication's revoked denylist. Request a new `PublisherCap` from the owner. |
| `0` | `ECollectionAlreadyExists` | `publication` | A collection with that name already exists in the publication. |
| `0` | `EEntryNotFound` | `collection` | No entry exists for the given `entry_id` in that collection. |
| `8` | `EBlobNotDeletable` | `entry` | The Walrus `Blob` object was not registered as deletable. Re-upload with `deletable: true`. |
| `5` | `EInvalidAccessPolicy` | `entry` | `encrypted`, `access_policy`, and `seal_id` are inconsistent. Unencrypted requires `(false, 0, None)`; encrypted requires `(true, 1, Some(sealId))`. |
| `12` | `ESealInvalidId` | `publication` | The Seal identity prefix does not match the publication's on-chain ID bytes. |
| `13` | `ESealWrongPolicyTag` | `publication` | The byte at position 32 of the Seal identity is not `0x01` (the publisher policy tag). |

## Next Steps

- [CLI: Overview](https://docs.morsecms.xyz/cli-overview.html): Install the CLI and manage publications, collections, and entries from the terminal.
- [SDK: Overview](https://docs.morsecms.xyz/sdk-overview.html): TypeScript client for building custom integrations and automating Morse operations.
