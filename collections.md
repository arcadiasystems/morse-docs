> Source: https://docs.morsecms.xyz/collections.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Collections

> A collection is a named content lane inside a publication. It groups related entries together and determines how their Walrus payload references are stored.

## What is a collection?

Collections organize entries into predictable buckets for editorial workflows and API consumers. A publication holds collections in a `VecMap<String, Collection>` keyed by name. The choice of `VecMap` reflects the expectation that a publication will have only a small number of named collections.

```move
public struct Collection has store {
  name: String,
  storage_mode: u8,        // 0 = blob, 1 = quilt; immutable after creation
  next_entry_id: u64,      // monotonic counter
  entries: Table<u64, Entry>,
}
```

## Storage modes

Every collection has a `storage_mode` set at creation that controls how entry revisions reference Walrus content.

### Blob mode

In blob mode, every revision stores a `BlobRef::Blob(ID)`, the Sui object ID of a standalone Walrus `Blob`. Each entry revision is fully independent: uploading new content creates a new blob, and the old blobs remain accessible by their IDs.

**Best for:**

- Articles, blog posts, documentation pages
- Media libraries (images, videos, audio)
- Any collection where entries change independently and frequently
- Situations where you want maximum operational simplicity

### Quilt mode

In quilt mode, every revision stores a `BlobRef::QuiltPatch(vector<u8>)`, a 37-byte identifier that locates a patch within a shared Walrus Quilt blob. This is more compact and efficient when updating small parts of a grouped content set.

```
┌─────────────────────────────────┬─────────┬───────────────┬─────────────┐
│  quilt_blob_id (32 bytes)        │ ver (1) │  start_idx (2) │  end_idx (2)│
└─────────────────────────────────┴─────────┴───────────────┴─────────────┘
  Walrus blob ID of the quilt       version   start index     end index
  (this is the Walrus blob_id,                (u16 LE)        (u16 LE)
   not the Sui object ID)
```

The contract validates that every `QuiltPatchId` is exactly 37 bytes. Shorter or longer byte vectors are rejected with `EInvalidQuiltPatchId`.

**Best for:**

- Website navigation sections or config-like structured documents
- Compact content sets updated in place (e.g. featured banners, site metadata)
- Stable grouped content with targeted patch updates

### Choosing a storage mode

| Scenario | Recommended mode |
| --- | --- |
| Growing blog / article feed | Blob (0) |
| Frequently updated individual documents | Blob (0) |
| Media / asset library | Blob (0) |
| Static site sections (header, footer, nav) | Quilt (1) |
| Config JSONs updated as a group | Quilt (1) |
| Small, bounded content sets | Quilt (1) |

> **WARNING: Storage mode is immutable**
>
> Once a collection is created with a given `storage_mode`, it cannot be changed. All entries in the collection must use references that match the collection's storage mode. The contract enforces this on every write.

## Creating a collection

Collections are created through the publication module's `create_collection` function, which requires a valid [PublisherCap](https://docs.morsecms.xyz/access-control.html#publishercap).

A collection cannot exist outside of a [publication](https://docs.morsecms.xyz/publications.html); every collection is scoped to exactly one.

**CLI:**

The `--mode` flag sets the storage mode (`blob` or `quilt`); defaults to `blob` if omitted.

```bash
morse collection create <name> [--mode <blob|quilt>]
```

The new collection is automatically selected as the active collection, so follow-up `entry` commands target it by default.

```example
morse collection create articles --mode blob

morse collection create site-pages --mode quilt
```

```output
Created collection "articles". Selected as the active collection. (tx: AbCdEf...)
```

**SDK:**

```typescript
import { createCollection } from "@arcadiasystems/morse-sdk";

// See sdk-client-setup.html for adapter and config initialization
// publicationId and publisherCapId come from createPublication() — see Publications page
const result = await createCollection(adapter, config, {
  publicationId: "0x1a2b...3c4d",
  publisherCapId: "0x7a8b...",
  name: "articles",
  storageMode: "blob",
});
// result → { digest, gasUsedMist }
```

**Move:**

```move
public fun create_collection(
  publication: &mut Publication,
  cap: &PublisherCap,
  name: String,
  storage_mode: u8,    // 0 = blob, 1 = quilt
  ctx: &mut TxContext,
)
```

Use [SDK Setup → morseConfig()](https://docs.morsecms.xyz/sdk-client-setup.html#morse-config) to get the package ID and registry ID, [SDK Setup → Server setup](https://docs.morsecms.xyz/sdk-client-setup.html#server-setup) to initialize the client, and [Contract Cookbooks](https://docs.morsecms.xyz/contracts-workflows.html) for complete PTB examples.

Collection names must be unique within a publication. Creating a collection with a name that already exists aborts with `ECollectionAlreadyExists`.

> **WARNING: Quilt mode limitations**
>
> Quilt-mode collections can be created, but the CLI's `morse entry add` command does not yet support populating them. To work with quilt-mode entries, use the SDK or construct PTBs directly. Blob mode is recommended for most use cases.

To list collections in a publication, use the CLI: `morse collection list`.

See [CLI Commands → Collection](https://docs.morsecms.xyz/cli-commands.html#collection) for the full syntax.

## Deleting a collection

Collections can be deleted, but only when **all entries have been removed first**.

**CLI:**

Pass `-y` before the subcommand to skip the prompt (e.g. `morse -y collection delete <name>`).

```bash
morse collection delete <name>
```

```example
morse collection delete articles
```

**SDK:**

```typescript
import { deleteCollection } from "@arcadiasystems/morse-sdk";

await deleteCollection(adapter, config, {
  publicationId: "0x1a2b...3c4d",
  publisherCapId: "0x7a8b...",
  name: "articles",
});
```

**Move:**

```move
public fun delete_collection(
  publication: &mut Publication,
  cap: &PublisherCap,
  name: String,
  ctx: &mut TxContext,
)
```

Entries must be removed first because the `Table<u64, Entry>` that holds them requires an explicit `destroy_empty`. Sui's type system does not allow dropping a non-empty table. Delete entries individually with `delete_entry_from_collection` before removing the collection.

## Events

Collection lifecycle events are emitted by the `publication` module.

| Event | When emitted | Fields |
| --- | --- | --- |
| `CollectionAdded` | Collection created in a publication | `publication: ID`, `name: String` |
| `CollectionRemoved` | Collection deleted from a publication | `publication: ID`, `name: String` |

## Error codes

For more error codes, see: [Publications](https://docs.morsecms.xyz/publications.html#error-codes), [Entries](https://docs.morsecms.xyz/entries.html#error-codes), [Access Control](https://docs.morsecms.xyz/access-control.html#error-codes).

| Code | Constant | Meaning |
| --- | --- | --- |
| `0` | `ECollectionAlreadyExists` | A collection with this name already exists in the publication (from `publication` module) |
| `0` | `EEntryNotFound` | No entry exists for the requested `entry_id` (from `collection` module) |
| `1` | `EInvalidStorageMode` | Storage mode must be `0` or `1` |
| `11` | `EInvalidQuiltPatchId` | Quilt patch ID must be exactly 37 bytes (from `entry` module) |
