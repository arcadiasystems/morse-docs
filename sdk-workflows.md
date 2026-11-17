> Source: https://docs.morsecms.xyz/sdk-workflows.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# SDK Cookbooks

> End-to-end recipes for `morse-sdk`: publish content, revise entries, encrypt and decrypt, delegate write access, and tear down resources. For installation and adapter wiring, see [SDK Setup](https://docs.morsecms.xyz/sdk-client-setup.html).

## Prerequisites

| Requirement | Details | Purpose |
| --- | --- | --- |
| Bun or Node | v1.2+ / ≥ 22 | JavaScript runtime |
| SUI + WAL tokens | [SUI faucet](https://faucet.sui.io/) · [Swap SUI for WAL](https://stake-wal.wal.app/?network=testnet) | Gas fees (SUI) and Walrus storage fees (WAL) |
| Bech32 private key | A `suiprivkey1...` string | SDK authentication. Export from your wallet's settings |

Make sure the SDK is installed and configured before continuing. See [SDK Setup](https://docs.morsecms.xyz/sdk-client-setup.html) for details.

## Lifecycle

Publications hold collections; collections hold entries; entries hold an append-only vector of revisions. Permission management lives in Sui; payloads live in Walrus.

The examples below assume you have built a context as shown in [SDK Setup](https://docs.morsecms.xyz/sdk-client-setup.html). Browser flows carry a `signer` (via `WalletStandardSigner.fromAccount`) instead of `keypair`. Walrus adapters (`walrusWriter`, `walrusReader`) are constructed where needed. See [Picking a Walrus Adapter](https://docs.morsecms.xyz/sdk-client-setup.html#picking-a-walrus-adapter) for options.

## Creating a publication

Returns the publication's ID along with an `OwnerCap` for governance and a `PublisherCap` for write access, both transferred to the caller's address atomically.

```typescript
import { ContractAbortError, createPublication } from "@arcadiasystems/morse-sdk";

try {
  const created = await createPublication(adapter, config, {
    name: "My Publication",
    slug: "my-publication",
  });
  // created.publicationId, created.ownerCapId, created.publisherCapId
} catch (err) {
  if (err instanceof ContractAbortError && err.reason === "ESlugAlreadyExists") {
    // slug is globally unique - pick another or look up the existing publication
  }
  throw err;
}
```

## Adding a collection

`storageMode` is fixed at creation; switching the mode for the same collection name requires deleting and recreating.

```typescript
import { createCollection } from "@arcadiasystems/morse-sdk";

await createCollection(adapter, config, {
  publicationId: created.publicationId,
  publisherCapId: created.publisherCapId,
  name: "blog",
  storageMode: "blob",  // or "quilt" for packed small payloads
});
```

## Adding an entry

Uploads bytes to Walrus and attaches them as the first revision of a new entry in 2 transactions. Returns the assigned `entryId` (a monotonic `u64`) used to reference the entry in all subsequent operations.

```typescript
import {
  addEntryFromBytes,
  DefaultWalrusWriteAdapter,
} from "@arcadiasystems/morse-sdk";

const walrusWriter = DefaultWalrusWriteAdapter.fromConfig(
  { network: "testnet", suiClient: client },
  keypair,  // or `signer` in the browser
);

const entry = await addEntryFromBytes(adapter, config, {
  walrus: walrusWriter,
  publicationId: created.publicationId,
  publisherCapId: created.publisherCapId,
  collectionName: "blog",
  name: "first-post",
  bytes: new TextEncoder().encode("hello world"),
  contentType: "text/plain",
  upload: { epochs: 3, deletable: true },
});
// entry.entryId is the stable monotonic ID (0, 1, 2, ...)
```

`addEntryFromBytes` uses the Walrus flow-aware capability to combine `certify_blob` and `add_entry_to_collection` into a single PTB, reducing the total from 3 transactions to 2. The HTTP publisher path collapses this further to 1 transaction.

> **WARNING: Handle `UncertifiedBlobError`**
>
> If transaction 1 (register + upload) succeeds but transaction 2 (certify + add_entry) fails, the SDK throws `UncertifiedBlobError` carrying `blobObjectId` and `blobId`. The blob exists on storage nodes but remains uncertified and is released when the registration expires. Log the IDs or surface the error for debugging.

See also: [CLI Cookbooks → Publishing your first entry](https://docs.morsecms.xyz/cli-workflows.html#publishing-your-first-entry)

## Encrypted content

Encrypts content with Seal, uploads ciphertext to Walrus, and attaches it as the first revision of an encrypted entry in 2 transactions. Returns the same `entryId` as the plaintext path. Encrypted entries are always created as drafts and accessed via Seal decryption, not the public read path.

```typescript
import {
  addEncryptedEntryFromBytes,
  buildPublisherSealId,
  createCollection,
  DefaultSealAdapter,
  DefaultWalrusWriteAdapter,
} from "@arcadiasystems/morse-sdk";

// Create a blob-mode collection for encrypted content.
await createCollection(adapter, config, {
  publicationId: created.publicationId,
  publisherCapId: created.publisherCapId,
  name: "secret-blog",
  storageMode: "blob",
});

const seal = DefaultSealAdapter.fromMorseConfig(config, {}, client);
const walrusWriter = DefaultWalrusWriteAdapter.fromConfig(
  { network: "testnet", suiClient: client },
  keypair,
);

// Fresh per-entry identity. publicId(32) || tag(1=Publisher) || nonce.
const nonce = crypto.getRandomValues(new Uint8Array(16));
const sealId = buildPublisherSealId(created.publicationId, nonce);

const plaintext = new TextEncoder().encode("secret content");
const result = await addEncryptedEntryFromBytes(adapter, config, {
  walrus: walrusWriter,
  seal,
  publicationId: created.publicationId,
  publisherCapId: created.publisherCapId,
  collectionName: "secret-blog",
  name: "private-doc",
  plaintext,
  contentType: "application/octet-stream",
  sealId,
  upload: { epochs: 3, deletable: true },
});
```

`buildPublisherSealId` constructs the Seal identity from the publication ID and a random nonce. Each entry needs a fresh nonce; reusing a nonce produces the same identity. When creating a `SessionKey`, always pass `config.originalPackageId ?? config.packageId` as the package ID. Seal uses the original (genesis) package address, not the current upgrade address.

> **WARNING: Encrypted entries are always created as drafts**
>
> `publishFromDraft` and `publishDirect` always write non-encrypted revisions; the contract hardcodes `encrypted=false` on the public path. For encrypted content, use `addEncryptedEntryFromBytes` / `appendEncryptedDraftRevision` and read via `seal.decrypt`.

### Reading encrypted entries

The full read flow for encrypted content combines entry metadata lookup, Walrus blob fetch, and Seal decryption. Decryption requires three things: a Seal `SessionKey` (built via wallet personal-message signature), the `sealId` bound to the revision, and a non-revoked `PublisherCap` ID.

```typescript
import { SessionKey } from "@mysten/seal";
import { DefaultSealAdapter, HttpAggregatorReadAdapter } from "@arcadiasystems/morse-sdk";

const seal = DefaultSealAdapter.fromMorseConfig(config, {}, client);
const walrusReader = HttpAggregatorReadAdapter.fromMorseConfig(config, client);

// 1. Read entry metadata to get the draft revision.
const fetched = await reader.getEntry(
  created.publicationId,
  "secret-blog",
  result.entryId,
);
const revision = fetched.revisions[fetched.draftHead];

// 2. Extract the blobRef and sealId from the revision.
const blobRef = revision.blobRef;   // { kind: "blob", blobObjectId: "0x..." }
const sealId = revision.sealId;     // Uint8Array

// 3. Fetch ciphertext from Walrus.
const ciphertext = await walrusReader.readBlobRef(blobRef);

// 4. Create a SessionKey and decrypt with Seal.
const sessionKey = await SessionKey.create({
  address: keypair.toSuiAddress(),
  packageId: config.originalPackageId ?? config.packageId,
  ttlMin: 10,
  signer: keypair,  // or `signer` in the browser
  suiClient: client,
});

const plaintext = await seal.decrypt(ciphertext, {
  sessionKey,
  sealId,
  publisherCapId: created.publisherCapId,
});

console.log(new TextDecoder().decode(plaintext));
```

### Encrypted draft revisions

After creating an encrypted entry with `addEncryptedEntryFromBytes`, use `appendEncryptedDraftRevision` to add subsequent encrypted revisions to the same entry. You encrypt and upload the blob yourself, then pass the `blobObjectId` to the SDK.

```typescript
import {
  appendEncryptedDraftRevision,
  buildPublisherSealId,
  DefaultSealAdapter,
  DefaultWalrusWriteAdapter,
} from "@arcadiasystems/morse-sdk";

const seal = DefaultSealAdapter.fromMorseConfig(config, {}, client);
const walrusWriter = DefaultWalrusWriteAdapter.fromConfig(
  { network: "testnet", suiClient: client },
  keypair,
);

// 1. Build a fresh Seal identity for the new revision.
const nonce = crypto.getRandomValues(new Uint8Array(16));
const sealId = buildPublisherSealId(created.publicationId, nonce);

// 2. Encrypt the updated content and upload to Walrus.
const updatedPlaintext = new TextEncoder().encode("updated secret content");
const { ciphertext } = await seal.encrypt(updatedPlaintext, { sealId });
const blob = await walrusWriter.uploadBlob(ciphertext, {
  epochs: 3,
  deletable: true,
});

// 3. Append the encrypted revision to the existing entry.
const revision = await appendEncryptedDraftRevision(adapter, config, {
  publicationId: created.publicationId,
  publisherCapId: created.publisherCapId,
  collectionName: "secret-blog",
  entryId: result.entryId,              // from addEncryptedEntryFromBytes
  blobObjectId: blob.blobObjectId,
  contentType: "application/octet-stream",
  sealId,
});

console.log("Revision", revision.revisionId, "appended");
```

See also: [CLI Cookbooks → Encrypted content](https://docs.morsecms.xyz/cli-workflows.html#encrypted-content)

## Reading it back

Single-object reads, paginated lists, and an async iterator for full-collection scans. The reader is gRPC-backed.

```typescript
import { HttpAggregatorReadAdapter } from "@arcadiasystems/morse-sdk";

const walrusReader = HttpAggregatorReadAdapter.fromMorseConfig(config, client);

// Single entry by ID.
const fetched = await reader.getEntry(
  created.publicationId,
  "blog",
  entry.entryId,
);
const firstRevision = fetched.revisions[0];

// Fetch the actual content bytes from Walrus.
const content = await walrusReader.readBlobRef(firstRevision.blobRef);
console.log(new TextDecoder().decode(content));

// Paginated list.
const page = await reader.listEntries(
  created.publicationId,
  "blog",
  { limit: 50 },
);
console.log(page.results.length, "entries, next cursor:", page.nextCursor);

// Stream every entry in a collection.
for await (const e of reader.scanEntries(created.publicationId, "blog")) {
  console.log(e.id, e.name);
}

// Single revision by entry ID and revision index.
const revision = await reader.getRevision(
  created.publicationId,
  "blog",
  entry.entryId,
  0,
);
```

> **INFO: Ordering caveat**
>
> `listEntries` and `scanEntries` return entries in dynamic-field object-store order, not chronological order. Sort by `entry.id` if you need insertion order.

### Publication and cap lookups

Beyond entries, the reader resolves publications and the caps that control them, useful for dashboards ("which publications does this wallet own?") and for verifying delegated write access:

```typescript
// Publication metadata: name, slug, collections.
const publication = await reader.getPublication(created.publicationId);

// Publications owned (via OwnerCap) by an address.
const owned = await reader.listPublicationsOwnedBy(adapter.address);
// owned.results: { ownerCapId, publicationId } handles (OwnedPublication)

// PublisherCaps held by an address, and a single cap by ID.
const caps = await reader.listPublisherCapsOwnedBy(adapter.address);
const cap = await reader.getPublisherCap(created.publisherCapId);
// cap.publicationId, cap.holder
```

All list methods return one page per call (`EntryListPage`, `PublicationListPage`, and `PublisherCapListPage`), each with a `results` array and a `nextCursor` (`null` when exhausted). They accept `{ limit, cursor, signal }` options (default limit 50; the cursor is opaque: feed `nextCursor` back in to get the next page). `scanEntries` auto-paginates and takes `{ pageSize, signal }` instead. Single-object reads (`getPublication`, `getPublisherCap`, `getEntry`, `getRevision`) throw `NotFoundError` when the target does not exist.

See also: [CLI Cookbooks → Reading it back](https://docs.morsecms.xyz/cli-workflows.html#reading-it-back)

## Publishing a new revision

Append a new public revision directly, or stage a draft first and promote it. Revisions are append-only; existing revisions are never edited in place. Two heads track progress: `draftHead` (work in progress) and `publicHead` (the live version).

### Option A: publish direct

Skip the draft stage and append a public revision in one step. Requires a pre-uploaded blob (use `uploadBlob` first).

```typescript
import { publishDirect, DefaultWalrusWriteAdapter } from "@arcadiasystems/morse-sdk";

const walrusWriter = DefaultWalrusWriteAdapter.fromConfig(
  { network: "testnet", suiClient: client },
  keypair,
);

const blob = await walrusWriter.uploadBlob(
  new TextEncoder().encode("updated content"),
  { epochs: 3, deletable: true },
);

const result = await publishDirect(adapter, config, {
  publicationId: created.publicationId,
  publisherCapId: created.publisherCapId,
  collectionName: "blog",
  entryId: entry.entryId,
  blobObjectId: blob.blobObjectId,
  contentType: "text/plain",
});
// result.revisionId is the index of the new public revision
```

### Option B: draft then publish

Stage a draft revision (updates `draftHead` only), iterate on it, then promote to a public revision. Both steps require a pre-uploaded blob (use `uploadBlob` first). The promotion appends a fresh public revision; the draft blob is referenced for validation but not reused.

```typescript
import { appendDraftRevision, publishFromDraft, DefaultWalrusWriteAdapter } from "@arcadiasystems/morse-sdk";

const walrusWriter = DefaultWalrusWriteAdapter.fromConfig(
  { network: "testnet", suiClient: client },
  keypair,
);

// 1. Upload the draft content
const draftBlob = await walrusWriter.uploadBlob(
  new TextEncoder().encode("draft content"),
  { epochs: 3, deletable: true },
);

// 2. Stage a draft revision
const draft = await appendDraftRevision(adapter, config, {
  publicationId: created.publicationId,
  publisherCapId: created.publisherCapId,
  collectionName: "blog",
  entryId: entry.entryId,
  blobObjectId: draftBlob.blobObjectId,
  contentType: "text/plain",
});

// 3. Upload the final content and promote the draft
const finalBlob = await walrusWriter.uploadBlob(
  new TextEncoder().encode("final content"),
  { epochs: 3, deletable: true },
);

const published = await publishFromDraft(adapter, config, {
  publicationId: created.publicationId,
  publisherCapId: created.publisherCapId,
  collectionName: "blog",
  entryId: entry.entryId,
  draftRevisionId: draft.revisionId,
  blobObjectId: finalBlob.blobObjectId,
  contentType: "text/plain",
});
```

See also: [CLI Cookbooks → Publishing a new revision](https://docs.morsecms.xyz/cli-workflows.html#publishing-a-new-revision)

## Delegating write access

Morse separates ownership (`OwnerCap`) from publishing (`PublisherCap`). The owner issues a cap bound to a co-author's address, granting them write access. Once issued, the co-author can publish entries using their own key. Revoking the cap causes further writes to abort on-chain. See [Access Control → Issuing publisher caps](https://docs.morsecms.xyz/access-control.html#issuing-publisher-caps) for details.

```typescript
import {
  issuePublisherCap,
  revokePublisherCap,
  destroyPublisherCap,
} from "@arcadiasystems/morse-sdk";

// Owner issues a cap bound to a co-author's address
const issued = await issuePublisherCap(adapter, config, {
  publicationId: created.publicationId,
  ownerCapId: created.ownerCapId,
  holder: "0xCO_AUTHOR_ADDRESS",
});
// issued.publisherCapId

// Owner revokes; further writes with this cap abort with EPublisherCapRevoked
await revokePublisherCap(adapter, config, {
  publicationId: created.publicationId,
  ownerCapId: created.ownerCapId,
  publisherCapId: issued.publisherCapId,
});

// Co-author destroys their own cap (requires an adapter built from the co-author's keypair; see SDK Setup)
await destroyPublisherCap(coAuthorAdapter, config, {
  publicationId: created.publicationId,
  publisherCapId: issued.publisherCapId,
});
```

> **WARNING: Holder binding is immutable**
>
> A PublisherCap is bound to the `holder` address at issue time. Transferring the Sui object to a different address does NOT grant write rights. To rotate authority to a new address, destroy the old cap and issue a fresh one.

See also: [CLI Cookbooks → Delegating write access](https://docs.morsecms.xyz/cli-workflows.html#delegating-write-access)

## Transferring ownership

Transfer the `OwnerCap` to a new address. The recipient gains governance rights: issuing/revoking publisher caps and deleting the publication. Existing publisher caps remain usable until individually revoked.

```typescript
import { transferOwnership } from "@arcadiasystems/morse-sdk";

await transferOwnership(adapter, config, {
  ownerCapId: created.ownerCapId,
  recipient: "0xNEW_OWNER_ADDRESS",
});
```

> **WARNING: One-way for the sender**
>
> Once transferred, the original owner loses all governance rights immediately. The new owner could transfer back, but there is no built-in undo.

See also: [CLI Cookbooks → Transferring ownership](https://docs.morsecms.xyz/cli-workflows.html#transferring-ownership)

## Deleting and tearing down

Deletion works bottom-up: remove entries first, then the collections, then the publication. The Move layer enforces this: deleting a non-empty collection or publication aborts on-chain. This assumes the caller still holds both a `PublisherCap` and the `OwnerCap`. 
Entry IDs are permanently retired on deletion and never reused. See [Entries → Deleting an entry](https://docs.morsecms.xyz/entries.html#deleting-an-entry) for details.

```typescript
import {
  deleteEntry,
  deleteCollection,
  deletePublication,
} from "@arcadiasystems/morse-sdk";

// 1. Remove all entries from each collection
await deleteEntry(adapter, config, {
  publicationId: created.publicationId,
  publisherCapId: created.publisherCapId,
  collectionName: "blog",
  entryId: entry.entryId,
});
await deleteEntry(adapter, config, {
  publicationId: created.publicationId,
  publisherCapId: created.publisherCapId,
  collectionName: "secret-blog",
  entryId: result.entryId,
});

// 2. Remove the empty collections
await deleteCollection(adapter, config, {
  publicationId: created.publicationId,
  publisherCapId: created.publisherCapId,
  name: "blog",
});
await deleteCollection(adapter, config, {
  publicationId: created.publicationId,
  publisherCapId: created.publisherCapId,
  name: "secret-blog",
});

// 3. Delete the publication (requires OwnerCap; reader verifies it's empty)
await deletePublication(reader, adapter, config, {
  publicationId: created.publicationId,
  ownerCapId: created.ownerCapId,
});
```

See also: [CLI Cookbooks → Deleting and tearing down](https://docs.morsecms.xyz/cli-workflows.html#deleting-and-tearing-down)

## Entry path options

The SDK provides two ways to publish content. `addEntryFromBytes` (and `addEncryptedEntryFromBytes` for encrypted content) handles upload and on-chain registration in one call and is the recommended default. For cases that need more control, use the split form: `uploadBlob` followed by `addEntry`.

| Use case | Function | Transactions |
| --- | --- | --- |
| Publish raw bytes as a new entry (typical case) | `addEntryFromBytes` | 2 |
| Publish encrypted bytes as a new entry | `addEncryptedEntryFromBytes` | 2 |
| Reuse one blob across many entries (deduplication) | `uploadBlob` once, then `addEntry` N times | 2 + N |
| Decouple upload and add-entry (draft-then-attach UX) | `uploadBlob` at upload time, `addEntry` at publish time | 2 + 1 |
| Server pre-uploads; browser only adds entries | `uploadBlob` (server), `addEntry` (browser) | 2 + 1 |

### Split upload path

When you need control over the upload step (for example, to retry blob registration independently or reuse a blob across entries), split the operation into two calls:

```ts
import { addEntry, DefaultWalrusWriteAdapter } from "@arcadiasystems/morse-sdk";

const walrusWriter = DefaultWalrusWriteAdapter.fromConfig(
  { network: "testnet", suiClient: client },
  keypair,
);

const content = new TextEncoder().encode("hello world");

// 1. Upload blob to Walrus (2 wallet popups: register + certify).
const blob = await walrusWriter.uploadBlob(content, {
  epochs: 3,
  deletable: true,
});

// 2. Reference the blob in a new entry (1 wallet popup).
const entry = await addEntry(adapter, config, {
  publicationId: created.publicationId,
  publisherCapId: created.publisherCapId,
  collectionName: "blog",
  name: "first-post",
  blobObjectId: blob.blobObjectId,
  contentType: "text/plain",
});
```

`addEntryFromBytes` requires an adapter that implements `WalrusFlowCapable`, which combines the certify and add-entry steps into a single transaction. `DefaultWalrusWriteAdapter` supports this; the HTTP publisher adapter does not. Passing an incompatible adapter throws a `TransportError` before any I/O. Use the split path (`uploadBlob` + `addEntry`) instead. To branch at runtime, use the `isWalrusFlowCapable(walrusWriter)` type guard, which detects the capability on any `WalrusWriteAdapter`.

## Next steps

- [CLI: Overview](https://docs.morsecms.xyz/cli-overview.html): Interactive command-line tool for managing publications, collections, and entries without writing code.
- [Smart Contracts: Overview](https://docs.morsecms.xyz/contracts-overview.html): Architecture of the Morse Move package: modules, shared objects, and the on-chain data model.
