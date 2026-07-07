> Source: https://docs.morsecms.xyz/publications.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/MandaWeb3/morse-docs/issues/new?labels=docs-feedback

# Publications

> A publication is the top-level permission management and identity boundary for a content domain in Morse. Everything - collections, entries, permissions - lives inside a publication.

## What is a Publication?

A `Publication` is a shared Sui object that acts as the root container for one content brand or site. It bundles:

- A human-readable **name** (display label)
- An immutable, globally unique **slug** (canonical URL key)
- A **collection map** holding all named content lanes
- A **revocation denylist** for publisher capabilities

```move
public struct Publication has key {
  id: UID,
  name: String,
  slug: String,
  collections: VecMap<String, Collection>,
  revoked_publisher_caps: Table<ID, bool>,
}
```

The `Publication` type has `key` ability but no `store`. Sharing and transfer are gated through this module's own functions, enforced by the Sui type system. You cannot wrap or freely transfer a publication - you must call `share_publication`.

## The Slug System

Every publication is identified by a **slug** - a short, lowercase string that becomes its canonical identifier across the protocol. Slugs are enforced to be globally unique by the `PublicationRegistry`.

### Slug Rules

| Rule | Constraint |
| --- | --- |
| Characters | Lowercase letters `a-z`, digits `0-9`, hyphens `-` |
| Length | 1 to 64 characters |
| Edge hyphens | Cannot start or end with `-` |
| Uniqueness | Must be globally unique while the publication is active |
| Immutability | Cannot be changed after publication creation |

```examples
// valid slugs
"my-blog"
"acme-corp"
"docs2025"

// invalid slugs
"-leading-hyphen"    // ESlugInvalidEdgeHyphen
"trailing-hyphen-"   // ESlugInvalidEdgeHyphen
"UPPERCASE"          // ESlugInvalidChar
"spaces not allowed" // ESlugInvalidChar
""                   // ESlugEmpty
```

### Slug Reuse After Deletion

When a publication is deleted, its slug is released from the registry and becomes available again. This is a deliberate tradeoff - it gives publishers flexibility to re-register slugs - but teams should be aware that a released slug can be re-claimed by anyone.

## PublicationRegistry

The `PublicationRegistry` is a **shared singleton** object created once in the package `init` function. It maintains a global `Table<String, ID>` mapping slugs to publication IDs, enforcing uniqueness across all publications.

```move
public struct PublicationRegistry has key {
  id: UID,
  slugs: Table<String, ID>,
}

// Look up a slug
public fun contains_slug(registry: &PublicationRegistry, slug: String): bool

// Resolve slug → publication ID
public fun get_publication_id_by_slug(registry: &PublicationRegistry, slug: String): &ID
```

The registry is a mandatory argument to `new_publication`. You cannot create a publication without passing the shared registry object.

To list publications owned by your account, use the CLI: `morse publication list`. You can also fetch a specific publication by slug with `morse publication get <slug>`.

See [CLI Commands → Publication](https://docs.morsecms.xyz/cli-commands.html#publication) for the full syntax.

## Creating a Publication

Publication creation follows the **pure-function pattern**: `new_publication` returns objects without performing any transfers. The caller decides what to do with them in a Programmable Transaction Block (PTB).

**CLI:**

```bash
morse publication create --name <name> --slug <slug>
```

The new publication is automatically selected as the active publication.

```example
morse publication create --name "My Blog" --slug my-blog
```

```output
Created "My Blog" (0x1a2b...3c4d)
  ownerCap:     0x5e6f...
  publisherCap: 0x7a8b...
  tx:           AbCdEf...
Selected as the active publication.
```

**SDK:**

```typescript
import { createPublication } from "@arcadiasystems/morse-sdk";

// See sdk-client-setup.html for adapter and config initialization
const pub = await createPublication(adapter, config, {
  name: "My Blog",
  slug: "my-blog",
});
// pub → { publicationId, ownerCapId, publisherCapId, digest, gasUsedMist }
```

**Move:**

```move
public fun new_publication(
  registry: &mut PublicationRegistry,
  name: String,
  slug: String,
  ctx: &mut TxContext,
): (Publication, OwnerCap, PublisherCap)

// Share the publication so other transactions can access it
public fun share_publication(publication: Publication)

// Transfer caps using the contract's typed wrappers (key-only, no store)
public fun transfer_owner_cap(owner_cap: OwnerCap, recipient: address)
public fun transfer_publisher_cap(cap: PublisherCap, recipient: address)
```

Use [SDK Setup → morseConfig()](https://docs.morsecms.xyz/sdk-client-setup.html#morse-config) to get the package ID and registry ID, [SDK Setup → Server Setup](https://docs.morsecms.xyz/sdk-client-setup.html#server-setup) to initialize the client, and [Contract Cookbooks](https://docs.morsecms.xyz/contracts-workflows.html) for complete PTB examples.

`new_publication` returns three objects in a tuple:

- **Publication** - the shared content container
- `OwnerCap` - admin authority over the publication (one per publication, held by the owner wallet). See [Access Control → OwnerCap](https://docs.morsecms.xyz/access-control.html#ownercap)
- `PublisherCap` - write authority for content operations, bound to the transaction sender. See [Access Control → PublisherCap](https://docs.morsecms.xyz/access-control.html#publishercap)

## Deleting a Publication

Publications can be deleted, but only when **all collections have been removed first**. Attempting to delete a publication with remaining collections aborts with an error.

**CLI:**

All commands target the active publication. Empty every collection first (entries, then the collection itself), then delete the publication. Pass `-y` before the subcommand to skip the prompt (e.g. `morse -y publication delete <slug>`).

```bash
morse publication delete [<slug|id>]
```

Omit `[<slug|id>]` to target the active one:

```example
morse publication delete my-blog
```

**SDK:**

```typescript
import { deletePublication } from "@arcadiasystems/morse-sdk";

// reader verifies all collections are empty before submitting the tx
await deletePublication(reader, adapter, config, {
  publicationId: "0x1a2b...3c4d",
  ownerCapId: "0x5e6f...",
});
```

**Move:**

```move
public fun delete_publication(
  registry: &mut PublicationRegistry,
  publication: Publication,
  owner_cap: OwnerCap,
)
```

On deletion:

1. The `OwnerCap` is consumed and its UID deleted
2. The slug is removed from the registry, `SlugReleased` event is emitted
3. The revocation denylist is dropped
4. The publication UID is deleted
5. A `PublicationDeleted` event is emitted

> **WARNING: Collections must be empty before deletion**
>
> The `VecMap` of collections will abort on `destroy_empty` if any collections remain. Remove all collections (and their entries) before calling `delete_publication`.

> **INFO: `PublisherCap`s are orphaned on deletion**
>
> Deleting a publication does not destroy outstanding `PublisherCap` objects. Any caps issued to other addresses remain as owned Sui objects, but they become permanently unusable - the publication they reference no longer exists, so all write operations will fail. Revoke or destroy caps before deleting the publication if you want a clean teardown.

## Ownership Transfer

Publication ownership can be transferred by transferring the `OwnerCap` to a new address. Since `OwnerCap` has only the `key` ability, transfer is handled by the module:

**CLI:**

Targets the active publication. Pass `--publication <slug>` to target a different one. Pass `-y` before the subcommand to skip the prompt (e.g. `morse -y publication transfer-ownership <recipient>`).

```bash
morse publication transfer-ownership <recipient> [--publication <slug|id>]
```

```example
morse publication transfer-ownership 0x71a3...9f2b
```

**SDK:**

```typescript
import { transferOwnership } from "@arcadiasystems/morse-sdk";

await transferOwnership(adapter, config, {
  ownerCapId: "0x5e6f...",
  recipient: "0x71a3...9f2b",
});
```

**Move:**

```move
public fun transfer_owner_cap(owner_cap: OwnerCap, recipient: address)
```

The recipient immediately gains full admin authority - the ability to issue/revoke publisher caps and delete the publication. Existing publisher caps remain valid until individually revoked.

After receiving the `OwnerCap`, the recipient must set the publication as active in their CLI before they can manage it: `morse use <slug>`.

## Publisher Cap Management

Publishers are managed through capability tokens. An owner can issue, revoke, and destroy publisher caps. Revoked caps are added to the publication's denylist, and any future operation attempted with a revoked cap aborts with `EPublisherCapRevoked`.

See [Access Control → PublisherCap](https://docs.morsecms.xyz/access-control.html#publishercap) for the full API with Move, CLI, and SDK examples.

## Events

The publications module emits the following events. An off-chain indexer can subscribe to these to maintain a live view of the publication registry.

| Event | When emitted | Fields |
| --- | --- | --- |
| `PublicationCreated` | New publication created | `publication: ID`, `name: String`, `slug: String` |
| `PublicationDeleted` | Publication deleted | `publication: ID`, `name: String` |
| `SlugRegistered` | Slug claimed in registry | `slug: String`, `publication: ID` |
| `SlugReleased` | Slug freed on deletion | `slug: String`, `publication: ID` |
| `PublisherCapIssued` | New publisher cap minted | `publication: ID`, `cap: ID` |
| `PublisherCapRevoked` | Publisher cap revoked by owner | `publication: ID`, `cap: ID` |

## Error Codes

For more error codes, see: [Collections](https://docs.morsecms.xyz/collections.html#error-codes), [Entries](https://docs.morsecms.xyz/entries.html#error-codes), [Access Control](https://docs.morsecms.xyz/access-control.html#error-codes).

| Code | Constant | Meaning |
| --- | --- | --- |
| `6` | `ESlugAlreadyExists` | A publication with this slug already exists in the registry |
| `7` | `ESlugEmpty` | The provided slug is an empty string |
| `8` | `ESlugTooLong` | Slug exceeds 64 characters |
| `9` | `ESlugInvalidChar` | Slug contains a character that is not `a-z`, `0-9`, or `-` |
| `10` | `ESlugInvalidEdgeHyphen` | Slug starts or ends with a hyphen |
| `2` | `EUnauthorized` | Capability does not belong to this publication |
| `4` | `EPublisherCapWrongHolder` | Publisher cap is bound to a different address than the transaction sender |
| `5` | `EPublisherCapRevoked` | Publisher cap has been revoked by the owner |
| `0` | `ECollectionAlreadyExists` | A collection with this name already exists |
