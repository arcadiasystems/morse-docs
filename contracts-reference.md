> Source: https://docs.morsecms.xyz/contracts-reference.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Contract Reference

> Complete reference for the Morse Move package - function signatures, struct definitions, events, error codes, and constants for the `publication`, `collection`, and `entry` modules.

## Publication module

All functions live in `publication::publication`. Functions that accept a `&PublisherCap` also validate that the cap is not revoked and that `cap.holder == ctx.sender()`.

### Publication Lifecycle

| Function | Description |
| --- | --- |
| `new_publication(registry: &mut PublicationRegistry, name: String, slug: String, ctx: &mut TxContext)` | Returns `(Publication, OwnerCap, PublisherCap)`. Create a publication and register its slug. Call `share_publication` and transfer caps in the same PTB. |
| `share_publication(publication: Publication)` | Share the publication object. Call after `new_publication` in the same PTB. |
| `delete_publication(registry: &mut PublicationRegistry, publication: Publication, owner_cap: OwnerCap)` | Requires `OwnerCap` (consumed). Delete a publication and release its slug. All collections must be empty first. |

### Registry Queries

| Function | Description |
| --- | --- |
| `contains_slug(registry: &PublicationRegistry, slug: String)` | Returns `bool`. Whether a slug is currently registered. |
| `get_publication_id_by_slug(registry: &PublicationRegistry, slug: String)` | Returns `&ID`. Resolve a slug to its publication object ID. Aborts if not registered. |

### Capability Management

| Function | Description |
| --- | --- |
| `transfer_owner_cap(owner_cap: OwnerCap, recipient: address)` | `OwnerCap` is consumed. Transfer ownership to another address. |
| `issue_publisher_cap(publication: &mut Publication, owner_cap: &OwnerCap, holder: address, ctx: &mut TxContext)` | Requires `OwnerCap`. Returns `PublisherCap`. Mint a new cap bound to `holder`. Emits `PublisherCapIssued`. |
| `revoke_publisher_cap(publication: &mut Publication, owner_cap: &OwnerCap, cap_id: ID)` | Requires `OwnerCap`. Add a cap ID to the revocation denylist. Emits `PublisherCapRevoked`. |
| `destroy_publisher_cap(publication: &mut Publication, cap: PublisherCap, ctx: &mut TxContext)` | Requires `PublisherCap` (holder only, consumed). Surrender write access. If revoked, also removes cap from the denylist. |
| `transfer_publisher_cap(cap: PublisherCap, recipient: address)` | `PublisherCap` is consumed. Transfer to another address. Does not change `holder` binding. |

### Collection Management

| Function | Description |
| --- | --- |
| `create_collection(publication: &mut Publication, cap: &PublisherCap, name: String, storage_mode: u8, ctx: &mut TxContext)` | Requires `PublisherCap`. Add a named collection. `storage_mode`: `0` (blob) or `1` (quilt), immutable. Emits `CollectionAdded`. |
| `delete_collection(publication: &mut Publication, cap: &PublisherCap, name: String, ctx: &mut TxContext)` | Requires `PublisherCap`. Remove a named collection. Entries must be empty. Emits `CollectionRemoved`. |

### Entry Management

| Function | Description |
| --- | --- |
| `add_entry_to_collection(publication: &mut Publication, cap: &PublisherCap, collection_name: String, name: String, blob: &Blob, quilt_patch_id: Option<vector<u8>>, content_type: String, encrypted: bool, access_policy: u8, seal_id: Option<vector<u8>>, ctx: &mut TxContext)` | Requires `PublisherCap`. Returns `u64` (entry ID). Create a new entry in a named collection. |
| `delete_entry_from_collection(publication: &mut Publication, cap: &PublisherCap, collection_name: String, entry_id: u64, ctx: &mut TxContext)` | Requires `PublisherCap`. Remove an entry by ID. The ID slot is not reused. |
| `append_collection_entry_draft_revision(publication: &mut Publication, cap: &PublisherCap, collection_name: String, entry_id: u64, blob: &Blob, quilt_patch_id: Option<vector<u8>>, content_type: String, encrypted: bool, access_policy: u8, seal_id: Option<vector<u8>>, ctx: &mut TxContext)` | Requires `PublisherCap`. Returns `u64` (revision index). Append a draft revision and advance `draft_head`. |
| `publish_collection_entry_from_draft(publication: &mut Publication, cap: &PublisherCap, collection_name: String, entry_id: u64, draft_revision_id: u64, blob: &Blob, quilt_patch_id: Option<vector<u8>>, content_type: String, ctx: &mut TxContext)` | Requires `PublisherCap`. Returns `u64` (revision index). Publish from a draft revision. Advances `public_head`. |
| `publish_collection_entry_direct(publication: &mut Publication, cap: &PublisherCap, collection_name: String, entry_id: u64, blob: &Blob, quilt_patch_id: Option<vector<u8>>, content_type: String, ctx: &mut TxContext)` | Requires `PublisherCap`. Returns `u64` (revision index). Publish directly without a draft. Advances `public_head`. |

## Seal Function

The Seal approval entry point is called by the Seal network during decryption - not by end users directly. It is declared as an `entry` function (not `public fun`).

| Function | Description |
| --- | --- |
| `seal_approve_publisher(id: vector<u8>, publication: &Publication, cap: &PublisherCap, ctx: &TxContext)` | Requires `PublisherCap`. Called by Seal during decryption. Validates active cap and Seal identity namespace. Format: `[publication_id_bytes][0x01][nonce]`. |

## Collection module

These functions are defined in `publication::collection`. All take a `&Collection` reference; the collection is always accessed through the parent `Publication` object.

| Function | Description |
| --- | --- |
| `get_name(collection: &Collection)` | Returns `String`. The collection's display name. |
| `get_storage_mode(collection: &Collection)` | Returns `u8`. Storage mode constant: `0` for blob, `1` for quilt. Immutable after creation. |
| `entries_length(collection: &Collection)` | Returns `u64`. Current number of entries. Does not account for holes from deleted entries. |

## Entry module

These functions are defined in `publication::entry`. Getter functions that operate on the latest revision use the last element of the `revisions` vector, not `public_head` or `draft_head`.

| Function | Description |
| --- | --- |
| `get_name(entry: &Entry)` | Returns `String`. The entry's display name. |
| `get_draft_head(entry: &Entry)` | Returns `Option<u64>`. Revision index of the current draft head. `None` if no draft exists. |
| `get_public_head(entry: &Entry)` | Returns `Option<u64>`. Revision index of the current public head. `None` if not yet published. |
| `get_blob_ref(entry: &Entry)` | Returns `BlobRef`. The blob reference from the latest revision. |
| `get_content_type(entry: &Entry)` | Returns `String`. MIME content type from the latest revision. |
| `get_encrypted(entry: &Entry)` | Returns `bool`. Whether the latest revision is encrypted. |
| `get_access_policy(entry: &Entry)` | Returns `u8`. Access policy of the latest revision: `0` = public, `1` = publisher, `2` = subscription. |
| `get_seal_id(entry: &Entry)` | Returns `Option<vector<u8>>`. Seal identity from the latest revision. `None` for unencrypted revisions. |
| `get_author(entry: &Entry)` | Returns `address`. Author of the latest revision (`ctx.sender()` at creation time). |
| `get_revision(entry: &Entry, revision_id: u64)` | Returns `&EntryRevision`. A specific revision by zero-based index. Aborts with `ERevisionNotFound` if out of bounds. |
| `access_policy_public()` | Returns `u8` (`0`). The `ACCESS_PUBLIC` constant. |
| `access_policy_publisher()` | Returns `u8` (`1`). The `ACCESS_PUBLISHER` constant. |
| `access_policy_subscription()` | Returns `u8` (`2`). The `ACCESS_SUBSCRIPTION` constant. Reserved - not yet implemented. |

## Constants

| Constant | Value | Module | Meaning |
| --- | --- | --- | --- |
| `MAX_SLUG_LENGTH` | `64` | `publication` | Maximum slug length in bytes. |
| `SEAL_POLICY_TAG_PUBLISHER` | `1` | `publication` | Policy tag byte for publisher-gated Seal identities. Placed after the publication ID bytes in the identity prefix. |
| `STORAGE_MODE_BLOB` | `0` | `collection` | Each entry references a standalone Walrus Blob by its Sui object ID. Use for dynamic collections. |
| `STORAGE_MODE_QUILT` | `1` | `collection` | Entries are patches within a shared Walrus Quilt blob, referenced by QuiltPatchId. Use for small, rarely-changing collections. |
| `MAX_ENTRY_NAME_LENGTH` | `256` | `entry` | Maximum entry name length in bytes. |
| `MAX_CONTENT_TYPE_LENGTH` | `255` | `entry` | Maximum `content_type` length in bytes. |
| `QUILT_PATCH_ID_LENGTH` | `37` | `entry` | Required exact byte length of a QuiltPatchId: `quilt_blob_id` (32) \|\| `version` (1) \|\| `start_index` (2) \|\| `end_index` (2). |
| `ACCESS_PUBLIC` | `0` | `entry` | Unencrypted public access policy. |
| `ACCESS_PUBLISHER` | `1` | `entry` | Publisher-gated encrypted access policy. |
| `ACCESS_SUBSCRIPTION` | `2` | `entry` | Subscription-gated access policy (reserved for future use). |

## Object Abilities

| Type | Abilities | Notes |
| --- | --- | --- |
| `Publication` | `key` | Shared object. No `store` - prevents wrapping outside this module. |
| `PublicationRegistry` | `key` | Shared singleton. Created by the package `init()` function at publish time. |
| `OwnerCap` | `key` | Owned object. Transferable. Exactly one exists per publication. |
| `PublisherCap` | `key` | Owned object. Holder-bound. Multiple can exist per publication. No `store` - cannot be fabricated externally. |
| `Collection` | `store` | Wrapped value inside `Publication.collections` VecMap. |
| `Entry` | `store, drop` | Wrapped value inside `Collection.entries` Table. Dropped automatically on deletion. |
| `EntryRevision` | `store, drop` | Element of the `Entry.revisions` vector. Immutable after creation. |
| `BlobRef` | `copy, drop, store` | Enum - either `Blob(ID)` or `QuiltPatch(vector<u8>)`. Copyable because it is a reference, not the blob itself. |

## Next Steps

- [Smart Contracts: Overview](https://docs.morsecms.xyz/contracts-overview.html): Package structure, struct definitions, capabilities, and known limitations.
- [Smart Contracts: Cookbooks](https://docs.morsecms.xyz/contracts-workflows.html): Step-by-step PTB recipes for publishing, encrypted entries, and cap management.
