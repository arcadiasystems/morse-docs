> Source: https://docs.morsecms.xyz/core-concepts.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Core Concepts

> Understand the fundamental building blocks of the Morse protocol - the data model, authorization system, storage strategy, and how on-chain and off-chain components interact.

## The Data Model

Morse organizes content in a four-level hierarchy. Each level is stored on-chain and has a clear responsibility:

- **Level 1**: Publication
- **Level 2**: Collection
- **Level 3**: Entry
- **Level 4**: Revision

### A Concrete Example

Imagine you run a team blog. Here's how it maps to the Morse data model:

- **Publication** `team-blog` - your brand-level content domain, registered with a unique slug
- **Collection** `articles` - one content lane for blog posts (blob mode, since each post is independent)
- **Entry #0** `welcome-post` - your first blog post, assigned the monotonic ID `0`
- **Revision 0** - the initial published version. `public_head` points here, so readers see it immediately
- **Revision 1** - an updated draft. `draft_head` points here, but `public_head` still points to revision 0 - readers see the original until you explicitly promote the draft

Editors operate mostly at the **Entry / Revision** level. Owners operate mostly at the **Publication / Authorization** level.

## Publications

Think of a publication as your project or site - it is the top-level namespace that groups all your content together. Every publication gets a unique slug (like `my-blog`) that acts as a human-readable identifier across the protocol. All collections, entries, and permissions live under this single umbrella.

[See Publications for the full reference →](https://docs.morsecms.xyz/publications.html)

## Collections

Collections are how you organize entries within a publication - similar to folders or content types. For example, a blog might have an `articles` collection and a `site-pages` collection. When you create a collection, you choose how its content is stored: individually as separate blobs (good for standalone posts or images) or as a shared document that can be patched in place (good for structured data like settings or configuration).

[See Collections for the full reference →](https://docs.morsecms.xyz/collections.html)

## Entries & Revisions

Entries are the actual content pieces - a blog post, an image, a page. Every edit creates a new revision rather than overwriting the previous one, giving you a complete version history that can never be lost. The system tracks two pointers for each entry: a draft head for work-in-progress and a public head that readers see. This lets drafts evolve privately while production clients serve stable published content.

[See Entries for the full reference →](https://docs.morsecms.xyz/entries.html)

## How Publishing Works

End-to-end flow when you publish content:

1. **Authenticate** - hold a `PublisherCap` for the target publication
2. **Upload** - upload content bytes to Walrus, get a blob reference
3. **Register** - create an entry on-chain storing the blob reference, content type, and access policy
4. **Heads update** - public_head and/or draft_head update based on encryption status
5. **Read** - any client resolves the entry and fetches the payload from Walrus

## Capability-Based Authorization

Instead of usernames and passwords, Morse uses on-chain capability objects to manage permissions. Owning the right object in your wallet proves you have permission to act - no login server required. Morse separates ownership from publishing using two types of capability tokens. An `OwnerCap` (one per publication) controls administrative operations like issuing permissions and deleting the publication. `PublisherCap`s (many per publication) grant write access and are bound to a specific holder address.

Revocation uses a denylist-based model - issuing caps is cheap (zero table writes), and only revocations write to the denylist. Once revoked, all future writes using that cap are immediately rejected.

[See Access Control for the full reference →](https://docs.morsecms.xyz/access-control.html)

## Walrus Storage

The Sui blockchain only stores references (pointers) to your content, not the content bytes themselves. The actual payloads live on Walrus, a decentralized storage network designed for large data. This separation keeps on-chain costs low while ensuring your content is permanently available and verifiable. Walrus is format-agnostic, so Morse can support JSON, Markdown, images, video, or any custom schema.

[See Collections → Storage Modes for storage mode details →](https://docs.morsecms.xyz/collections.html#storage-modes)

## Access Control

Morse can gate content behind on-chain encryption using Seal. Only users who meet specific on-chain conditions can decrypt and read the content. This means access rules are enforced by the blockchain itself, not by a server you have to trust. This approach enables paid subscriptions, token-gated access, team-only content, and other models - all without a centralized gatekeeper.

[See Access Control for the full reference →](https://docs.morsecms.xyz/access-control.html)

## Off-Chain Services

The blockchain is the canonical source of truth, but off-chain services improve the developer experience. Morse provides optional infrastructure like an indexer (for fast search and queries) and a content API (for read access) so you do not have to query the chain directly. These services make building apps on Morse faster and simpler, but they are not required.

- **Indexer** - listens to on-chain events and builds a read-optimized state database
- **Content API** - serves fast queries for listings, slug resolution, and payload references
- **SDK** - TypeScript package that wraps Sui/Walrus/Seal interactions for app developers
- **CLI** - command-line tool for scripted automation, CI, and agent-native workflows

Importantly, all off-chain services are replaceable. Any team can run their own indexer, API, or integrate directly with the contracts via the SDK. Protocol access is never gated by a single service provider.

## Next Steps

- [Quick Start](https://docs.morsecms.xyz/quick-start.html): Choose CLI, SDK, or Smart Contracts and go from zero to published content on testnet.
- [Publications](https://docs.morsecms.xyz/publications.html): Full reference for the top-level content container: slugs, capabilities, and lifecycle.
- [Collections](https://docs.morsecms.xyz/collections.html): Storage modes, entry IDs, and collection management.
- [Access Control](https://docs.morsecms.xyz/access-control.html): OwnerCap, PublisherCap, revocation, and Seal encryption.
