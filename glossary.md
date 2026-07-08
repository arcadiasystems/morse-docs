> Source: https://docs.morsecms.xyz/glossary.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Glossary

> Terms used throughout the Morse protocol and this documentation.

## A

**[Access Policy](https://docs.morsecms.xyz/entries.html#access-policy-and-encryption-rules)** — A numeric constant stored per revision that defines who can read the payload. Current values: `0` (public), `1` (publisher), `2` (subscription, reserved). Strictly coupled with the `encrypted` flag: public (`0`) requires `encrypted=false`; publisher (`1`) requires `encrypted=true`.

## B

**[Blob Mode](https://docs.morsecms.xyz/collections.html#storage-modes)** — Storage mode `0` for collections. Each entry revision stores a `BlobRef::Blob(ID)` pointing to an independent Walrus `Blob` object by Sui object ID. Best for growing, frequently-changing collections.

**[BlobRef](https://docs.morsecms.xyz/entries.html#the-blobref-enum)** — A Move enum stored per revision that abstracts the two Walrus payload reference formats. Variants: `Blob(ID)` for standalone blobs, `QuiltPatch(vector<u8>)` for 37-byte quilt patch identifiers.

## C

**[Capability](https://docs.morsecms.xyz/access-control.html)** — A Move object that proves authorization to perform a specific action. Morse has two capability types: `OwnerCap` (admin authority) and `PublisherCap` (write authority). Capabilities cannot be fabricated - they can only be issued by the protocol.

**CMS** — Content Management System. Software for creating, organizing, and publishing structured digital content. Morse implements a decentralized, headless CMS protocol where permission management lives on-chain rather than in a centralized backend.

**[Collection](https://docs.morsecms.xyz/collections.html#what-is-a-collection)** — A named content lane inside a [publication](https://docs.morsecms.xyz/publications.html). Holds entries in a table keyed by monotonic `entry_id` values. Has an immutable `storage_mode` (blob or quilt).

**[Content Type](https://docs.morsecms.xyz/entries.html#entry-structure)** — A MIME-format string stored per entry revision that describes the payload format (e.g. `application/json`, `text/markdown`, `image/png`). Max 255 characters. Lowercase is recommended for consistency but not enforced on-chain.

## D

**dCMS** — Decentralized Content Management System - the category Morse belongs to. Publication identity, authorization, and state transitions are governed on-chain; payloads are stored off-chain in decentralized storage (Walrus).

**[Denylist](https://docs.morsecms.xyz/access-control.html#the-denylist-model)** — The revocation model used for PublisherCaps. A `Table<ID, bool>` on each publication stores IDs of revoked caps. Issuance writes nothing to the table; only revocations write. This optimizes for the common case where revocations never occur.

**[Draft Head](https://docs.morsecms.xyz/entries.html#the-dual-head-model)** — An `Option<u64>` pointer in an Entry that tracks the index of the latest draft revision. May be `None` if no draft has been created. Updated by `append_collection_entry_draft_revision`.

**[Dual-head Model](https://docs.morsecms.xyz/entries.html#the-dual-head-model)** — The entry versioning architecture where each entry maintains two independent revision head pointers: `draft_head` (latest work-in-progress) and `public_head` (currently published). Enables editorial iteration without disrupting stable reader delivery.

## E

**[Entry](https://docs.morsecms.xyz/entries.html#entry-structure)** — A single content unit within a collection. Holds a name, an immutable revision vector, and two head pointers. Identified by a stable monotonic `entry_id` within its collection.

**[Entry ID](https://docs.morsecms.xyz/entries.html#entry-ids)** — A `u64` assigned to an entry when added to a collection. Values start at `0` and increment monotonically. IDs are never reused after deletion - stable for external references.

**[EntryRevision](https://docs.morsecms.xyz/entries.html#revisions)** — The Move struct that stores a single revision's data: `blob_ref`, `content_type`, `encrypted`, `access_policy`, `seal_id`, and `author`. Has `store, drop` abilities. Stored in an entry's `revisions` vector.

**Epoch** — A Walrus storage duration unit - roughly **one day on testnet** (two weeks on mainnet). When uploading a blob, the `epochs` parameter controls how long the data is available on the Walrus network; expired blobs can be renewed before their deadline. Passed as `--epochs <n>` in the CLI or `epochs: number` in the SDK.

**Events** — On-chain event structs emitted by the Morse contracts during state transitions. All have `copy, drop` abilities. Includes `PublicationCreated`, `PublicationDeleted`, `SlugRegistered`, `SlugReleased`, `PublisherCapIssued`, `PublisherCapRevoked`, `CollectionAdded`, and `CollectionRemoved`. See the Events tables on [Publications](https://docs.morsecms.xyz/publications.html#events), [Collections](https://docs.morsecms.xyz/collections.html#events), and [Entries](https://docs.morsecms.xyz/entries.html#events).

## G

**gRPC** — A high-performance RPC framework used by `SuiGrpcClient` from `@mysten/sui/grpc`. The Morse SDK requires gRPC transport for all Sui interactions. Works in modern browsers without a proxy. See [SDK Overview → Known Limitations](https://docs.morsecms.xyz/sdk-overview.html#known-limitations) for JSON-RPC fallback status.

## H

**Headless CMS** — A CMS architecture that separates content management from presentation. The CMS manages content and metadata; client applications decide how to render it. Content is delivered through APIs. Morse follows this model while decentralizing identity, authorization, and state transitions.

**[Holder](https://docs.morsecms.xyz/access-control.html#publishercap)** — The `address` field on a PublisherCap that binds the capability to a specific wallet. Write operations check that `tx.sender() == cap.holder`. A cap cannot be shared between addresses.

## I

**Indexer** — The off-chain service that listens to on-chain events and builds a read-optimized index of publications, collections, and entries. Currently planned. See [How Morse Works → Off-Chain Services](https://docs.morsecms.xyz/core-concepts.html#off-chain-services).

## M

**[Monotonic ID](https://docs.morsecms.xyz/entries.html#entry-ids)** — A collection-scoped, auto-incrementing integer assigned to each entry. IDs are never reused after deletion. See [Entries → Entry IDs](https://docs.morsecms.xyz/entries.html#entry-ids).

**Move** — The programming language used for smart contracts on the Sui blockchain. Morse's on-chain logic is written in Move.

## O

**[OwnerCap](https://docs.morsecms.xyz/access-control.html#ownercap)** — The admin capability for a publication. Exactly one exists per publication. Grants authority to issue and revoke publisher caps, delete the publication, and transfer ownership. Has `key` ability only - transferable via `transfer_owner_cap`.

## P

**[Publication](https://docs.morsecms.xyz/publications.html#what-is-a-publication)** — The top-level Morse content domain. A shared Sui object that bundles a name, an immutable slug, named collections, and a revocation denylist. Created via `new_publication`.

**[PublicationRegistry](https://docs.morsecms.xyz/publications.html#publication-registry)** — A shared singleton Sui object created at package deploy time. Maintains a `Table<String, ID>` that maps slugs to publication IDs, enforcing global slug uniqueness. Required argument for `new_publication` and `delete_publication`.

**[Public Head](https://docs.morsecms.xyz/entries.html#the-dual-head-model)** — An `Option<u64>` pointer in an Entry that tracks the index of the currently published revision. What reader-facing clients should read. Updated by `publish_collection_entry_from_draft` and `publish_collection_entry_direct`.

**[PublisherCap](https://docs.morsecms.xyz/access-control.html#publishercap)** — The write capability for a publication. Many can exist per publication. Grants authority to create/delete collections and entries, append drafts, and publish content. Bound to a `holder` address. Issued by the owner; revocable by the owner.

**PTB** — Programmable Transaction Block - Sui's composable transaction format. Multiple operations can be combined into a single atomic transaction. The Morse protocol uses pure creation functions that return objects for callers to compose in PTBs.

**[Policy Tag](https://docs.morsecms.xyz/access-control.html#seal-identity-format)** — A single byte in a Seal identity that identifies which access policy the identity targets. Currently only `0x01` (publisher) is defined. Allows future policy types to coexist within the same publication namespace.

## Q

**[Quilt Mode](https://docs.morsecms.xyz/collections.html#storage-modes)** — Storage mode `1` for collections. Each entry revision stores a 37-byte `QuiltPatchId` pointing to a patch within a shared Walrus Quilt blob. Best for stable, grouped content sets.

**[QuiltPatchId](https://docs.morsecms.xyz/collections.html#storage-modes)** — A 37-byte identifier used in quilt mode collections. Layout: `quilt_blob_id (32 bytes) || version (1 byte) || start_index (2 bytes) || end_index (2 bytes)`. Stored as a `BlobRef::QuiltPatch(vector<u8>)`.

## R

**[Revision](https://docs.morsecms.xyz/entries.html#revisions)** — An immutable version of an entry at a point in time. Stored in the entry's `revisions: vector<EntryRevision>`. Each revision records a `BlobRef`, content type, encryption state, access policy, optional Seal identity, and author address. Revisions are never mutated - edits append new ones.

**[Revision ID](https://docs.morsecms.xyz/entries.html#revisions)** — The index of a revision within an entry's `revisions` vector. Starts at `0`. Returned by all revision-appending functions. Used to reference a specific revision in `publish_collection_entry_from_draft`.

**[Revocation](https://docs.morsecms.xyz/access-control.html#revoking-publisher-caps)** — The act of adding a `PublisherCap`'s object ID to a publication's denylist via `revoke_publisher_cap`. Immediate effect - the next write attempt using the revoked cap will abort. Historical content is unaffected.

## S

**[Seal](https://docs.morsecms.xyz/access-control.html#seal-integration)** — Mysten Labs' on-chain access control layer for Walrus blob decryption. Morse integrates via the `seal_approve_publisher` entry function, which validates that an active publisher cap holder is authorized within a specific publication namespace.

**[Seal Identity](https://docs.morsecms.xyz/access-control.html#seal-identity-format)** — A byte vector (`vector<u8>`) that Seal presents to the approval function during decryption. In Morse, the format is: `[publication_id (32 bytes)][policy_tag (1 byte)][nonce (variable)]`. Scopes decryption approval to a specific publication and policy.

**[Shared Object](https://docs.morsecms.xyz/contracts-reference.html#object-abilities)** — A Sui object accessible to any transaction, not owned by a single address. In Morse, `Publication` and `PublicationRegistry` are shared objects. Shared objects enable multi-writer collaboration but require consensus on ordering.

**[Slug](https://docs.morsecms.xyz/publications.html#the-slug-system)** — A short, unique identifier for a publication. Immutable after creation. Constraints: lowercase `a-z`, digits `0-9`, hyphens; max 64 characters; no leading/trailing hyphens. Enforced globally by the `PublicationRegistry`.

**[Storage Mode](https://docs.morsecms.xyz/collections.html#storage-modes)** — An immutable property of a collection that determines how entry revision blob references are stored. `0` = blob mode (standalone Walrus blobs), `1` = quilt mode (QuiltPatchId references).

**Sui** — The Layer 1 blockchain on which Morse contracts are deployed. Sui uses the Move programming language and features an object-centric data model, parallel execution, and programmable transaction blocks.

## T

**Table** — A Sui framework type (`sui::table::Table`) used by Morse for dynamic key-value storage within on-chain objects. For example, collections store entries in a `Table<u64, Entry>`.

## W

**WAL** — The utility token of the Walrus decentralized storage network. WAL is used to pay for blob storage and is separate from SUI (the gas token for Sui transactions).

**Walrus** — MystenLabs' decentralized blob storage network integrated with Sui. Morse stores all content payloads in Walrus - the contracts hold references (`BlobRef`), not the raw bytes. Walrus is format-agnostic; payload interpretation is the client's responsibility.

**[Walrus Blob](https://docs.morsecms.xyz/entries.html#walrus-blob-requirements)** — A Sui object (`walrus::blob::Blob`) representing a payload stored in the Walrus network. Production Morse write paths require a reference to this object (not just the blob ID) so the contract can verify the blob is deletable.
