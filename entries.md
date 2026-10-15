> Source: https://docs.morsecms.xyz/entries.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Entries & Revisions

> An entry is a single content unit within a collection. Revisions are its immutable history. The dual-head model lets drafts evolve freely while production readers always see a stable published state.

## Entry structure

Entries live inside collections, stored in a `Table<u64, Entry>`. They have `store` and `drop` abilities; they are values owned by their collection, not independent Sui objects.

```move
public struct Entry has store, drop {
  name: String,
  revisions: vector<EntryRevision>,
  draft_head: Option<u64>,   // index into revisions
  public_head: Option<u64>,  // index into revisions
}
```

The `name` field must be non-empty and at most 256 characters.

## Revisions

Each revision is an immutable snapshot of an entry at a point in time. Revisions are never mutated after creation; edits always append new revisions to the vector.

```move
public struct EntryRevision has store, drop {
  blob_ref: BlobRef,          // Walrus content reference
  content_type: String,       // MIME type (e.g. "application/json")
  encrypted: bool,
  access_policy: u8,          // 0=public, 1=publisher, 2=subscription
  seal_id: Option<vector<u8>>, // required when encrypted=true
  author: address,            // tx sender at time of write
}
```

The `content_type` field must be non-empty and at most 255 characters; standard MIME format is recommended.

### The BlobRef enum

`BlobRef` is a Move enum that abstracts the two storage modes (the SDK surfaces it as a discriminated union; switch on `.kind`):

```move
public enum BlobRef has copy, drop, store {
  Blob(ID),              // Sui object ID of a standalone Walrus Blob
  QuiltPatch(vector<u8>), // 37-byte QuiltPatchId
}
```

The variant used must match the collection's [storage mode](https://docs.morsecms.xyz/collections.html#storage-modes). The `make_blob_ref` function enforces this; you cannot accidentally mix modes.

## The dual-head model

Every entry maintains two independent head pointers into its revision vector:

- **`draft_head`**: Points to the latest draft revision. Work in progress, not visible to public readers. May be `None` on a freshly-published entry.
- **`public_head`**: Points to the currently published revision. Stable for readers. May be `None` on an entry that has only drafts.
```
revisions: [rev0, rev1(draft), rev2(draft), rev3(public), rev4(draft)]
                                              ↑ public_head=3   ↑ draft_head=4
```

This is what makes real editorial workflows possible: editors can keep appending drafts while production clients continuously serve the stable `public_head`.

## Adding an entry

Create a new entry and add it to a named collection. Requires a valid [PublisherCap](https://docs.morsecms.xyz/publications.html#publisher-cap-management). Returns the assigned `entry_id`.

An entry cannot exist outside of a [collection](https://docs.morsecms.xyz/collections.html); every entry is scoped to exactly one.

**CLI:**

The `--file` flag provides the content; `--content-type` is inferred from the file extension if omitted. `--epochs` controls Walrus storage duration (defaults to 3).

```bash
morse entry add <name> --file <path> [--content-type <type>] [--epochs <n>]
```

```example
echo '{"title":"Welcome","body":"Hello, Morse!"}' > welcome.json

morse entry add "welcome-post" --file ./welcome.json --content-type application/json --epochs 5
```

```output
Added entry #0 "welcome-post". (tx: AbCdEf...)
```

**SDK:**

```typescript
import { addEntryFromBytes } from "@arcadiasystems/morse-sdk";

// See sdk-client-setup.html for adapter, config, and walrusWriter initialization
// publicationId and publisherCapId come from createPublication() - see Publications page
const result = await addEntryFromBytes(adapter, config, {
  walrus: walrusWriter,
  publicationId: "0x1a2b...3c4d",
  publisherCapId: "0x7a8b...",
  collectionName: "articles",
  name: "welcome-post",
  bytes: new TextEncoder().encode("Hello, Morse!"),
  contentType: "text/plain",
  upload: { epochs: 5, deletable: true },
});
// result → { entryId, digest, gasUsedMist }
```

**Move:**

Upload content to Walrus first using `DefaultWalrusWriteAdapter` from `morse-sdk`. Pass the resulting Blob object ID in the PTB.

```typescript
const content = new TextEncoder().encode(
  JSON.stringify({ title: "Welcome", body: "Hello, Morse!" })
);
const { blobObjectId: BLOB_OBJECT_ID } = await walrusWriter.uploadBlob(content, {
  epochs: 3, deletable: true,
});
```

```move
public fun add_entry_to_collection(
  publication: &mut Publication,
  cap: &PublisherCap,
  collection_name: String,
  name: String,
  blob: &Blob,                           // must be deletable
  quilt_patch_id: Option<vector<u8>>,    // Some for quilt mode, None for blob mode
  content_type: String,
  encrypted: bool,
  access_policy: u8,
  seal_id: Option<vector<u8>>,
  ctx: &mut TxContext,
): u64                                   // returns entry_id
```

Use [SDK Setup → morseConfig()](https://docs.morsecms.xyz/sdk-client-setup.html#morse-config) to get the package ID and registry ID, [SDK Setup → Server setup](https://docs.morsecms.xyz/sdk-client-setup.html#server-setup) to initialize the client, and [Contract Cookbooks](https://docs.morsecms.xyz/contracts-workflows.html) for complete PTB examples.

For unencrypted public entries: `encrypted = false`, `access_policy = 0`, `seal_id = None`. The initial revision goes directly to `public_head`.

> **WARNING: Encrypted entries are always created as drafts**
>
> When `encrypted = true` and `access_policy = 1` (publisher), the initial revision goes to `draft_head` only; there is no `public_head` yet. Published revisions are always unencrypted and public, so to publish an encrypted entry you must supply a new unencrypted blob using `publish_from_draft` or `publish_direct`. A revision cannot be both published and encrypted.

To list entries in a collection, use the CLI: `morse entry list`. The command supports pagination with `--limit` and `--cursor` flags, and `--drafts-only` to filter for draft entries.

See [CLI Commands → Entry](https://docs.morsecms.xyz/cli-commands.html#entry) for the full syntax.

## Appending a draft revision

Append a new revision to an existing entry and advance `draft_head`. The previous revisions are untouched.

**CLI:**

Upload new content and append it as a draft revision on an existing entry. The `draft_head` advances; `public_head` is unchanged.

```bash
morse revision append-draft <entryId> --file <path> [--content-type <type>] [--epochs <n>]
```

```example
echo '{"title":"Welcome","body":"Updated content"}' > welcome-v2.json

morse revision append-draft 0 --file ./welcome-v2.json --content-type application/json
```

```output
Appended draft revision #1 on entry #0. (tx: AbCdEf...)
```

**SDK:**

```typescript
import { appendDraftRevision } from "@arcadiasystems/morse-sdk";

// Revision functions require a pre-uploaded blob  - upload to Walrus first.
const blob = await walrusWriter.uploadBlob(
  new TextEncoder().encode("updated content"),
  { epochs: 3, deletable: true },
);

// Append the draft using the blob's on-chain object ID.
const result = await appendDraftRevision(adapter, config, {
  publicationId: "0x1a2b...3c4d",
  publisherCapId: "0x7a8b...",
  collectionName: "articles",
  entryId: 0,
  blobObjectId: blob.blobObjectId,
  contentType: "application/json",
});
```

**Move:**

Upload content to Walrus first using `DefaultWalrusWriteAdapter` from `morse-sdk`. Pass the resulting Blob object ID in the PTB.

```typescript
const content = new TextEncoder().encode(
  JSON.stringify({ title: "Welcome", body: "Updated content" })
);
const { blobObjectId: BLOB_OBJECT_ID } = await walrusWriter.uploadBlob(content, {
  epochs: 3, deletable: true,
});
```

```move
public fun append_collection_entry_draft_revision(
  publication: &mut Publication,
  cap: &PublisherCap,
  collection_name: String,
  entry_id: u64,
  blob: &Blob,
  quilt_patch_id: Option<vector<u8>>,
  content_type: String,
  encrypted: bool,
  access_policy: u8,
  seal_id: Option<vector<u8>>,
  ctx: &mut TxContext,
): u64                                   // returns new revision_id
```

## Publishing from draft

Take a specific draft revision and publish it. This appends a new public revision and advances `public_head`. The draft revision is referenced for traceability.

**CLI:**

Promote a draft to public. By default, reuses the draft's existing content. Pass `--file` to publish replacement content instead. Appends a new public revision and advances `public_head`.

```bash
morse revision publish-from-draft <entryId> <draftRevisionId> [--file <path>] [--content-type <type>] [--epochs <n>]
```

Without replacement content (reuses the draft's blob):

```example
morse revision publish-from-draft 0 1
```

With replacement content:

```example
echo '{"title":"Welcome","body":"Final version"}' > welcome-final.json

morse revision publish-from-draft 0 1 --file ./welcome-final.json
```

```output
Published revision #2 from draft #1 on entry #0. (tx: AbCdEf...)
```

**SDK:**

```typescript
import { publishFromDraft } from "@arcadiasystems/morse-sdk";

// Upload the final content to Walrus  - the published revision needs its own blob.
const blob = await walrusWriter.uploadBlob(
  new TextEncoder().encode("final content"),
  { epochs: 3, deletable: true },
);

// Promote the draft; the new public revision references this blob.
const result = await publishFromDraft(adapter, config, {
  publicationId: "0x1a2b...3c4d",
  publisherCapId: "0x7a8b...",
  collectionName: "articles",
  entryId: 0,
  draftRevisionId: 1,
  blobObjectId: blob.blobObjectId,
  contentType: "application/json",
});
```

**Move:**

Upload content to Walrus first using `DefaultWalrusWriteAdapter` from `morse-sdk`. Pass the resulting Blob object ID in the PTB.

```typescript
const content = new TextEncoder().encode(
  JSON.stringify({ title: "Welcome", body: "Final version" })
);
const { blobObjectId: BLOB_OBJECT_ID } = await walrusWriter.uploadBlob(content, {
  epochs: 3, deletable: true,
});
```

```move
public fun publish_collection_entry_from_draft(
  publication: &mut Publication,
  cap: &PublisherCap,
  collection_name: String,
  entry_id: u64,
  draft_revision_id: u64,               // reference to the specific draft
  blob: &Blob,
  quilt_patch_id: Option<vector<u8>>,
  content_type: String,
  ctx: &mut TxContext,
): u64                                   // returns new revision_id
```

The resulting public revision always has `encrypted = false` and `access_policy = ACCESS_PUBLIC`.

## Publishing direct

Append a new public revision directly, skipping the draft workflow. Advances `public_head` in one step.

**CLI:**

```bash
morse revision publish-direct <entryId> --file <path> [--content-type <type>] [--epochs <n>]
```

```example
echo '{"title":"Welcome","body":"Hotfix content"}' > welcome-hotfix.json

morse revision publish-direct 0 --file ./welcome-hotfix.json --content-type application/json
```

```output
Published revision #3 on entry #0. (tx: AbCdEf...)
```

**SDK:**

```typescript
import { publishDirect } from "@arcadiasystems/morse-sdk";

// Upload the new content to Walrus first.
const blob = await walrusWriter.uploadBlob(
  new TextEncoder().encode("updated content"),
  { epochs: 3, deletable: true },
);

// Publish directly using the blob's on-chain object ID.
const result = await publishDirect(adapter, config, {
  publicationId: "0x1a2b...3c4d",
  publisherCapId: "0x7a8b...",
  collectionName: "articles",
  entryId: 0,
  blobObjectId: blob.blobObjectId,
  contentType: "application/json",
});
```

**Move:**

Upload content to Walrus first using `DefaultWalrusWriteAdapter` from `morse-sdk`. Pass the resulting Blob object ID in the PTB.

```typescript
const content = new TextEncoder().encode(
  JSON.stringify({ title: "Welcome", body: "Hotfix content" })
);
const { blobObjectId: BLOB_OBJECT_ID } = await walrusWriter.uploadBlob(content, {
  epochs: 3, deletable: true,
});
```

```move
public fun publish_collection_entry_direct(
  publication: &mut Publication,
  cap: &PublisherCap,
  collection_name: String,
  entry_id: u64,
  blob: &Blob,
  quilt_patch_id: Option<vector<u8>>,
  content_type: String,
  ctx: &mut TxContext,
): u64
```

## Entry IDs

When an entry is added to a collection, it is assigned a stable, monotonically increasing `entry_id: u64`. The counter starts at `0` and increments with each insertion.

- Entry IDs are **never reused** after deletion
- IDs are **stable**; external systems can safely hold references by ID
- Gaps in the ID sequence are expected and normal after deletions

```example id sequence
// Add entries: IDs assigned sequentially
entry_id = add_entry_to_collection(...) // → 0
entry_id = add_entry_to_collection(...) // → 1
entry_id = add_entry_to_collection(...) // → 2

// Delete entry 1
delete_entry_from_collection(..., entry_id: 1, ...)

// Next add gets ID 3  ID 1 is never reused
entry_id = add_entry_to_collection(...) // → 3
```

## Deleting an entry

Remove an entry by ID. Since `Entry` has the `drop` ability, it is simply dropped from the table.

**CLI:**

Delete an entry and all its revisions. This cannot be undone. Pass `-y` before the subcommand to skip the prompt (e.g. `morse -y entry delete <entryId>`).

```bash
morse entry delete <entryId>
```

```example
morse entry delete 0
```

**SDK:**

```typescript
import { deleteEntry } from "@arcadiasystems/morse-sdk";

await deleteEntry(adapter, config, {
  publicationId: "0x1a2b...3c4d",
  publisherCapId: "0x7a8b...",
  collectionName: "articles",
  entryId: 0,
});
```

**Move:**

```move
public fun delete_entry_from_collection(
  publication: &mut Publication,
  cap: &PublisherCap,
  collection_name: String,
  entry_id: u64,
  ctx: &mut TxContext,
)
```

> **NOTE: Blob objects are independent**
>
> Deleting an entry removes the on-chain record and the `BlobRef`, but does not delete the underlying Walrus `Blob` object on Sui. Blob lifecycle management (storing, deleting the blob object from Walrus) is the caller's responsibility.

## Typical editorial workflow

The workflow below applies to both Blob and Quilt storage modes. In Quilt mode, entries target a specific patch within the shared document rather than a standalone blob, but the revision lifecycle is the same.

1. **Add the entry**
   Call `add_entry_to_collection` with your Walrus blob. This creates revision 0. For public content, `public_head = Some(0)` immediately. For encrypted content, `draft_head = Some(0)`.

2. **Iterate in draft**
   Call `append_collection_entry_draft_revision` as many times as needed. Each call appends a new revision and advances `draft_head`. Readers still see the old `public_head`.

3. **Publish**
   Call `publish_collection_entry_from_draft` (referencing a specific `draft_revision_id`) or `publish_collection_entry_direct`. Both append a new public revision and advance `public_head`. Readers now see the new content.

4. **Continue iterating**
   Append more drafts after publishing. The cycle continues without limit. Every revision is preserved in the immutable history vector.

## Walrus blob requirements

All production write paths require a reference to the Walrus `&Blob` object (not just its ID). The contract calls `blob.is_deletable()` and aborts with `EBlobNotDeletable` if the blob is not deletable. This ensures the platform can manage blob lifecycle.

### Blob lifecycle: epochs, expiry, renewal

The on-chain revision history is immutable, but the payloads it points to are not stored "forever" by default: Walrus storage is **funded per epoch** (roughly one day on testnet, two weeks on mainnet). The `epochs` parameter on every upload sets how long the blob stays available; after its final epoch the blob expires and storage nodes drop it, while the on-chain `BlobRef` and revision metadata remain. Renew a blob before expiry (or re-upload and append a new revision) for longer-lived content.

Morse deliberately requires *deletable* blobs rather than Walrus's permanent variant: a CMS needs unpublishing, correction, and takedown paths. Permanence in Morse means the **history is verifiable and tamper-proof**, not that bytes are irrevocable.

> **WARNING: Testnet payloads are disposable**
>
> The quick starts upload with `epochs: 3`, about three days on testnet. Walrus testnet is also wiped periodically (every few months). Treat testnet content as throwaway; fund more epochs and set renewal reminders only for things you actually want to keep around.

> **TIP: Testing without Walrus blobs**
>
> In Move unit tests, `walrus::blob::Blob` cannot be constructed because its constructor is `public(package)`. Use the `_for_testing` variants (e.g. `add_entry_to_collection_for_testing`) that accept a raw `blob_id: ID` instead of `&Blob`. These bypass only the deletable check; all other logic is identical.

## Access policy & encryption rules

The `encrypted` flag and `access_policy` must be consistent. The contract enforces this at every write. See [Access Control](https://docs.morsecms.xyz/access-control.html) for the full permission model.

| encrypted | access_policy | seal_id | Result |
| --- | --- | --- | --- |
| `false` | `0` (PUBLIC) | `None` | Valid: unencrypted public revision |
| `true` | `1` (PUBLISHER) | `Some(<id>)` | Valid: encrypted publisher-gated revision |
| `true` | `0` | any | Aborts: `EInvalidAccessPolicy` |
| `false` | `1` | any | Aborts: `EInvalidAccessPolicy` |
| `true` | `1` | `None` | Aborts: `ESealIdRequired` |
| `false` | `0` | `Some(<id>)` | Aborts: `ESealIdNotAllowed` |

`ACCESS_SUBSCRIPTION = 2` is defined in the protocol but reserved for future use.

## Events

Entry and revision operations do not emit on-chain events. Use the transaction log or an indexer to track changes.

## Error codes

For more error codes, see: [Publications](https://docs.morsecms.xyz/publications.html#error-codes), [Collections](https://docs.morsecms.xyz/collections.html#error-codes), [Access Control](https://docs.morsecms.xyz/access-control.html#error-codes).

| Code | Constant | Meaning |
| --- | --- | --- |
| `0` | `ENameEmpty` | Entry name is empty |
| `1` | `EContentTypeEmpty` | Content type is empty |
| `2` | `ENameTooLong` | Entry name exceeds 256 characters |
| `3` | `EContentTypeTooLong` | Content type exceeds 255 characters |
| `4` | `ERevisionNotFound` | Requested revision index does not exist |
| `5` | `EInvalidAccessPolicy` | Encrypted/access_policy mismatch |
| `6` | `ESealIdRequired` | Encrypted revision must include a Seal identity |
| `7` | `ESealIdNotAllowed` | Unencrypted revision must not include a Seal identity |
| `8` | `EBlobNotDeletable` | Walrus blob must be deletable |
| `9` | `EQuiltPatchIdRequired` | Quilt mode collection requires a QuiltPatchId |
| `10` | `EQuiltPatchIdNotAllowed` | Blob mode collection must not include a QuiltPatchId |
| `11` | `EInvalidQuiltPatchId` | QuiltPatchId must be exactly 37 bytes |
