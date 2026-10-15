> Source: https://docs.morsecms.xyz/contracts-overview.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Contract Overview

> The Morse smart contract is a Move package named `publication` deployed on Sui. It manages publications, collections, and entries on-chain, with content stored on Walrus. Interact with it directly via Sui Programmable Transaction Blocks (PTBs) using `@mysten/sui`.

> **INFO: Testnet deployment**
>
> Use [SDK Setup → morseConfig()](https://docs.morsecms.xyz/sdk-client-setup.html#morse-config) to get the current package ID, original ID, and registry ID. These values update automatically when the contract is upgraded.

## Getting started

Use `morseConfig()` from `@arcadiasystems/morse-sdk` to resolve the package and registry addresses, then construct PTBs with `tx.moveCall`. See the [Contract Reference](https://docs.morsecms.xyz/contracts-reference.html) for complete function signatures and struct definitions, and the [Contract Cookbooks](https://docs.morsecms.xyz/contracts-workflows.html) for step-by-step recipes.

## Package structure

The package compiles three modules. Every public entry point lives in `publication::publication`; the other two modules define the data types and internal logic it builds on.

| Module | Source file | Role |
| --- | --- | --- |
| `publication::publication` | `sources/publication.move` | Defines `Publication`, `OwnerCap`, `PublisherCap`, and `PublicationRegistry`. Top-level API for publication lifecycle, capability issuance, collection and entry operations, and Seal approval. |
| `publication::collection` | `sources/collection.move` | Defines `Collection` and the storage-mode constant, manages the per-collection `Table<u64, Entry>`. |
| `publication::entry` | `sources/entry.move` | Defines `Entry`, `EntryRevision`, and the `BlobRef` enum. Contains revision append and publish logic and access-policy validation. |

## Struct definitions

### Publication module

```move
// Root container for a publication. Shared object  - key only (no store).
public struct Publication has key {
  id: UID,
  name: String,
  slug: String,
  collections: VecMap<String, Collection>,
  revoked_publisher_caps: Table<ID, bool>,
}

// Shared singleton. Created by the package initializer. Holds slug-to-ID mapping.
public struct PublicationRegistry has key {
  id: UID,
  slugs: Table<String, ID>,
}

// Proves ownership. One per publication. Transferable.
public struct OwnerCap has key {
  id: UID,
  publication_id: ID,
}

// Grants write access. Many per publication. Holder-bound.
public struct PublisherCap has key {
  id: UID,
  publication_id: ID,
  holder: address,
}
```

### Collection module

```move
// Stored value inside Publication.collections VecMap.
public struct Collection has store {
  name: String,
  storage_mode: u8,       // 0 = STORAGE_MODE_BLOB, 1 = STORAGE_MODE_QUILT. Immutable.
  next_entry_id: u64,     // Monotonic counter; never decremented on delete.
  entries: Table<u64, Entry>,
}
```

### Entry module

```move
// Stored value inside Collection.entries Table.
public struct Entry has store, drop {
  name: String,
  revisions: vector<EntryRevision>,
  draft_head: Option<u64>,
  public_head: Option<u64>,
}

// Immutable revision metadata appended to Entry.revisions.
public struct EntryRevision has store, drop {
  blob_ref: BlobRef,
  content_type: String,
  encrypted: bool,
  access_policy: u8,
  seal_id: Option<vector<u8>>,
  author: address,
}

// Identifies the Walrus content for a revision.
// Blob(ID): Sui object ID of a standalone Walrus Blob (STORAGE_MODE_BLOB).
// QuiltPatch(vector<u8>): 37-byte QuiltPatchId  - quilt_blob_id (32) || version (1) || start_index (2) || end_index (2).
public enum BlobRef has copy, drop, store {
  Blob(ID),
  QuiltPatch(vector<u8>),
}
```

## What PTBs give you

- **Full transaction control**: Compose multiple Move calls in a single PTB: create a publication, add a collection, and publish an entry atomically.
- **No SDK abstraction layer**: Call the contract functions directly. Useful when the SDK does not expose a wrapper for your use case or when you need fine-grained control.
- **Custom batching**: Delete 50 entries, 3 collections, and a publication in one transaction. The SDK processes these sequentially; PTBs batch them.
- **BCS encoding**: Pass Option<vector<u8>> and other Move types directly via @mysten/sui/bcs. Required for encrypted entries and quilt patches.

## Known limitations

- **No encrypted publish path.** `publish_from_draft` and `publish_direct` hardcode `encrypted = false`. Encrypted content stays as drafts. See [Entries → Adding an entry](https://docs.morsecms.xyz/entries.html#adding-an-entry) for the full lifecycle.
- **Only the Publisher access policy is enforced.** The `Subscription` policy constant is defined but the approval entry point is not yet implemented.
- **All blobs must be deletable.** The contract calls `blob.is_deletable()` and aborts if a permanent blob is passed.
- **Single entry point module.** All public functions live in `publication::publication`. The other modules are internal.

## Next steps

- [Smart Contracts: Reference](https://docs.morsecms.xyz/contracts-reference.html): Complete function signatures, events, error codes, and constants.
- [Smart Contracts: Cookbooks](https://docs.morsecms.xyz/contracts-workflows.html): Step-by-step recipes for creating publications, managing entries, and encrypting content via PTBs.
