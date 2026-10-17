> Source: https://docs.morsecms.xyz/recipient-files.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Recipient Files

> Recipient files are Morse's second content model: standalone files on Walrus with a per-file recipient list enforced on-chain. Encrypt a file for specific addresses, share it with a single string, and revoke access at decrypt time. No publication required.

## Overview

Publications, collections, and entries model structured CMS content: a site with editors, drafts, and revision history. Recipient files model something simpler: *"share THIS file with these addresses."* Each file is an independent shared object on Sui (`RecipientFile`, defined in the `recipient_file` Move module) that references a Walrus blob and embeds its own recipient set. There is no shared ACL across files and no capability objects involved.

|  | Publication entries | Recipient files |
| --- | --- | --- |
| Container | Publication → Collection → Entry | None: each file stands alone |
| Write authority | `PublisherCap` (capability object) | `owner` address field on the file |
| Read gating | Publisher Seal policy (tag `1`): any active cap holder | Recipient-file Seal policy (tag `3`): addresses in the file's `members` set |
| Revision history | Append-only revisions | None: metadata is mutable, content is fixed at creation |
| Use for | Sites, blogs, structured content | Ad-hoc encrypted file sharing between wallets |

Use recipient files when the unit of sharing is a single file and the audience is a specific list of wallets: contracts, reports, credentials, media handoffs. Use [entries](https://docs.morsecms.xyz/entries.html) when content belongs to a publication and is gated by publisher capabilities.

> **INFO: Supersedes the legacy `file` + `allowlist` modules**
>
> Earlier contract versions modeled encrypted files as an `EncryptedFile` paired with a separate `Allowlist` object. The `recipient_file` module embeds the recipient set directly on the file and replaces that pair. The legacy modules remain in the package bytecode for old clients, but all new code (SDK and CLI included) uses `recipient_file`.

## The RecipientFile object

A `RecipientFile` is created in the same transaction that certifies its Walrus blob, then immediately shared so Seal key servers can dry-run its approval function regardless of who asks:

```move
public struct RecipientFile has key {
  id: UID,
  owner: address,               // may mutate metadata, edit recipients, transfer, delete
  blob_id: vector<u8>,         // Walrus content id (32 bytes)
  blob_object_id: Option<ID>,  // on-chain Walrus Blob object, when known
  name: String,                 // original filename (max 256 chars)
  content_type: String,         // MIME type (max 255 chars)
  size: u64,                    // plaintext byte length
  members: VecSet<address>,    // addresses that may decrypt
  created_at_ms: u64,           // Sui clock timestamp, set once
}
```

Key semantics, enforced by the contract:

- **The creator is always a member.** `new_recipient_file` auto-inserts the transaction sender into `members`; duplicates in the recipients argument (including a self-reference) are silently deduplicated.
- **Owner and member are separate roles.** The `owner` field grants mutation rights; `members` grants decrypt access. The owner can remove themselves from `members`; they lose decrypt access but keep mutation rights.
- **`size` is the plaintext length.** The Walrus blob stores the larger ciphertext (Seal adds an envelope). The field is informational for UIs, not validated against Walrus.
- **Metadata is mutable, content is not.** Only `name` and `content_type` can change after creation. To change the content, upload a new file.
- **Shared object.** The creation PTB calls `share_recipient_file`, so the file belongs to no wallet. Anyone can read the record; only `owner` passes the mutation checks.

### Move operations

| Function | Authority | Effect |
| --- | --- | --- |
| `new_recipient_file` | Anyone | Create a file record (returned by value; share it in the same PTB). Sender auto-added to `members`. |
| `new_recipient_file_with_seal_prefix` | Anyone | Same, plus binds a caller-supplied Seal identity prefix to the file via a dynamic field. Used by all encrypted upload flows. |
| `share_recipient_file` | Creator (same PTB) | Share the object so key servers can dry-run approval. |
| `add_recipient` | Owner | Add an address to `members`. Aborts if already present. |
| `remove_recipient` | Owner | Remove an address from `members`. Aborts if not present. |
| `update_metadata` | Owner | Replace `name` and `content_type`. |
| `transfer_ownership` | Owner | Set a new `owner`. Does *not* touch `members`. |
| `delete_file` | Owner | Delete the metadata record. The Walrus blob is untouched. |
| `seal_approve` / `seal_approve_with_prefix` | Seal key servers (dry-run) | Abort unless the sender is a current member and the Seal identity matches the file's namespace. |

Every mutation emits an event (`RecipientFileCreated`, `RecipientAdded`, `RecipientRemoved`, `RecipientFileMetadataUpdated`, `RecipientFileOwnershipTransferred`, `RecipientFileDeleted`, `RecipientFileSealPrefixAttached`). These events are the discovery mechanism. See [Listing & Discovery](#listing-and-discovery).

## Encryption & the recipient list

Encrypted recipient files use **Seal**, the same threshold-encryption layer that gates encrypted entries, but under a second, independent policy. Both policies coexist in the same contract package:

|  | Publisher policy | Recipient-file policy |
| --- | --- | --- |
| Policy tag | `1` | `3` |
| Identity prefix | Publication ID (32 bytes) | Caller-chosen random bytes (32 recommended), bound to the file at creation |
| Approval function | `publication::seal_approve_publisher` | `recipient_file::seal_approve_with_prefix` (or `seal_approve` for legacy files) |
| Who may decrypt | Holders of an active `PublisherCap` | Addresses in the file's `members` set |
| Documented at | [Access Control → Seal integration](https://docs.morsecms.xyz/access-control.html#seal-integration) | This page |

### Seal identity format

A recipient-file Seal identity is the byte concatenation of a prefix, the policy tag, and a per-encryption nonce:

```
┌────────────────────────────┬────────────────┬───────────────────────┐
│ seal_id_prefix (≥1 byte)   │ policy_tag (1) │ nonce (≥1 byte)       │
└────────────────────────────┴────────────────┴───────────────────────┘
  Random, caller-chosen.       Must be 0x03     Fresh per encryption.
  32 bytes recommended.        for the          16 bytes recommended.
  Bound to the file on-chain   recipient-file
  at creation.                 policy.
```

The prefix solves an ordering problem: a file's Sui object ID does not exist until its creation transaction is signed, but encryption must happen *before* upload, which happens before that transaction. So the client picks a random prefix, encrypts under `prefix || 0x03 || nonce`, and binds the same prefix to the file on-chain via `new_recipient_file_with_seal_prefix`. This is what makes the whole upload fit in a single certify-and-create PTB.

The SDK exposes the recommended sizes as `RECOMMENDED_SEAL_PREFIX_BYTES` (32) and `RECOMMENDED_SEAL_NONCE_BYTES` (16), and generates values with `randomSealPrefix()` / `randomSealNonce()`. Files created via the older `new_recipient_file` path use the file's object ID itself as the prefix and are approved by the plain `seal_approve` entry point; `get_seal_id_prefix` tells clients which variant a file uses.

### Decryption sequence

Decryption is gated on-chain, at decrypt time, by the current recipient set:

1. **Recipient creates a `SessionKey`**: their wallet signs a personal message producing a time-limited key scoped to the contract package. The SDK never builds session keys silently; the consumer always signs.
2. **SDK builds an approval PTB**: `decryptUnderRecipientFile` constructs a transaction calling `recipient_file::seal_approve_with_prefix` with the Seal identity and the shared `RecipientFile` object.
3. **Seal key servers dry-run it**: each server executes the PTB against current chain state. The Move function checks that the identity starts with the file's bound prefix, carries policy tag `3`, and that the requesting address is in `members`. Any failure and the server refuses its share.
4. **Threshold shares are returned**: once the threshold (default 2) is met, the client combines shares and decrypts the Walrus ciphertext locally.

> **INFO: Revocation is enforced at decrypt time**
>
> Because key servers re-check `members` on every request, `remove_recipient` takes effect immediately: the removed address gets `SealError` code `no-access` on its next decrypt attempt (verified on testnet). Revocation cannot claw back plaintext a recipient already decrypted; it stops future key-share requests, nothing more.

## CLI workflows

The `morse file` command group covers the full lifecycle. See [CLI Overview](https://docs.morsecms.xyz/cli-overview.html) for installation and account setup.

### Upload & share

One command encrypts, uploads to Walrus, and registers the file on-chain. Pass `-r/--recipient` once per recipient; the sender is always added automatically. `--encrypt` is implied when `-r` is given.

```bash
morse file upload <path> -n <name> --encrypt [-r <addr>]... [--content-type <mime>] [--epochs <n>]
```

```example
morse file upload ./launch-plan.md -n launch-plan.md -r 0x71a3...9f2b -r 0x88c2...41de
```

```output
Uploaded encrypted file 0x5f0a...c37e
  blobId: kD3x...vQ8
  share:  mf1.MHg1ZjBh...LmM4.4kfx....9dQz
  tx:     4N94D7Zn...
Give the share string to recipients; they need it (plus membership) to decrypt.
```

The **share string** (`mf1.<fileId>.<prefix>.<nonce>`, each part base64url) bundles everything a recipient needs to locate and decrypt the file. It survives copy-paste and chat. It is not a secret capability by itself (decryption still requires the recipient's address to be in the on-chain member set), but treat it as sensitive: the prefix and nonce are not recoverable from the ciphertext, so a lost share string means a member cannot decrypt.

For a world-readable file, use `--public` instead of `--encrypt`. The bytes go to Walrus unencrypted and the CLI prints a direct aggregator URL (`<aggregator>/v1/blobs/<blobId>`). Anyone can fetch it without the CLI at all. `--public` and `-r` are mutually exclusive.

### Download

Recipients decrypt with the share string. The CLI reads the on-chain record, fetches the ciphertext from Walrus, signs a short-lived `SessionKey` (10 minutes) with the active account, and decrypts locally:

```bash
morse file download --share <string> --out <path> [--via-aggregator]
```

- `--share` carries the file ID, prefix, and nonce in one token. Alternatively pass the file ID positionally with `--prefix <hex> --nonce <hex>`.
- `--raw` writes the stored bytes without decrypting. For an encrypted file (one with a Seal prefix attached on-chain) and no decrypt input, the CLI refuses by default (the ciphertext is unusable), and `--raw` is the explicit opt-in.
- `--out` writes to a file; omitting it streams to stdout (not available in `--json` mode).

The encrypted round-trip is byte-for-byte: the downloaded plaintext is identical to the uploaded file (verified on testnet). A non-member running the same command gets `SealError` code `no-access`; a tampered ciphertext fails with `decrypt-failed`.

> **WARNING: Freshly uploaded blobs may fail the default read path on testnet**
>
> Right after an upload, the default verifying Walrus read often fails with "No valid blob metadata could be retrieved from any storage node" while testnet storage nodes catch up. Pass `--via-aggregator` to fetch through the Walrus aggregator HTTP service instead; it is reliable immediately, at the cost of client-side blob verification.

### Managing recipients

The owner can grant and revoke decrypt access at any time; changes take effect on the next decrypt attempt:

```bash
morse file recipient add <file> <address>
morse file recipient remove <file> <address>
morse file recipient list <file>
```

A newly added recipient also needs the share string (prefix + nonce) to decrypt; membership alone locates the key shares but not the identity bytes. Send it over any channel; the on-chain member check is what actually gates access.

### Lifecycle commands

| Command | Description |
| --- | --- |
| `file get <file>` | Fetch the on-chain metadata record. |
| `file list [--address <addr>] [--accessible] [--hydrate] [--limit <n>]` | List files owned by (or, with `--accessible`, decryptable by) an address, via event indexing. `--hydrate` fetches full records (one read per file). |
| `file register --blob-id <id> -n <name> --content-type <mime> --size <bytes> (--public \| --encrypted --seal-prefix <hex>) [-r <addr>]...` | Register on-chain metadata for a blob already on Walrus, e.g. one uploaded out-of-band. |
| `file update <file> -n <name> --content-type <mime>` | Update name and content type. Owner only. |
| `file transfer-ownership <file> <newOwner>` | Transfer mutation rights. Recipient access is governed separately by the member list. Prompts; pass `-y` before the subcommand to skip. |
| `file delete <file>` | Delete the metadata record. The Walrus blob is *not* deleted; it expires on its own storage lease. Prompts; `-y` skips. |

> **WARNING: Ownership transfer does not move decrypt access**
>
> `transfer_ownership` changes only the `owner` field. For a full handover (new owner gains decrypt access, old owner loses it), also run `recipient add <file> <newOwner>` and `recipient remove <file> <oldOwner>` (or compose all three calls in one PTB via the SDK).

## SDK usage

All recipient-file APIs are exported from the `@arcadiasystems/morse-sdk` root. The examples below assume the adapter, config, and client setup from [SDK Setup](https://docs.morsecms.xyz/sdk-client-setup.html).

### Encrypted upload

`uploadEncryptedRecipientFileFromBytes` is the one-shot flow: it picks a random Seal prefix and nonce, encrypts, uploads to Walrus, and creates the file, in two wallet interactions (Walrus `register_blob`, then a combined `certify_blob + new_recipient_file_with_seal_prefix + share` PTB):

```typescript
import {
  DefaultSealAdapter,
  DefaultWalrusWriteAdapter,
  uploadEncryptedRecipientFileFromBytes,
} from "@arcadiasystems/morse-sdk";

const seal = DefaultSealAdapter.fromMorseConfig(config, {}, client);
const walrus = DefaultWalrusWriteAdapter.fromConfig(
  { network: "testnet", suiClient: client },
  keypair,
);

const result = await uploadEncryptedRecipientFileFromBytes(adapter, config, {
  walrus,
  seal,
  plaintext: new TextEncoder().encode("the launch plan"),
  recipients: ["0x71a3...9f2b"],   // sender is auto-added on-chain
  name: "launch-plan.md",
  contentType: "text/markdown",
  upload: { epochs: 3, deletable: true },
});
// result → { fileId, blobId, blobObjectId, digest, gasUsedMist,
//            sealIdPrefix, sealNonce }
// Persist sealIdPrefix + sealNonce: recipients need both to decrypt,
// and they are not recoverable from the ciphertext.
```

For an unencrypted file, use `uploadRecipientFileFromBytes` (same shape, no `seal`, `bytes` instead of `plaintext`). To register a blob you uploaded separately, use `createRecipientFile` (public) or `createEncryptedRecipientFile` (takes the `sealIdPrefix` the blob was encrypted under). Both upload helpers require a Walrus write adapter that implements `startBlobUpload` (`DefaultWalrusWriteAdapter` does); if the second transaction fails after the upload succeeded, they throw `UncertifiedBlobError` with the stranded blob's IDs.

### Decrypt with a SessionKey

Decryption needs the file ID, the Seal prefix and nonce, and a `SessionKey`. The SDK never signs on your behalf; creating the session key is an explicit personal-message signature by the consumer:

```typescript
import { SessionKey } from "@mysten/seal";
import {
  buildRecipientFileSealId,
  HttpAggregatorReadAdapter,
  RpcRecipientFilesReader,
} from "@arcadiasystems/morse-sdk";

// 1. Read the on-chain record and fetch the ciphertext from Walrus.
const filesReader = RpcRecipientFilesReader.fromConfig(client, config);
const file = await filesReader.getRecipientFile(result.fileId);

const walrusReader = HttpAggregatorReadAdapter.fromMorseConfig(config, client);
const ciphertext = await walrusReader.readBlob(file.blobId);

// 2. Sign a SessionKey (wallet personal-message signature).
const sessionKey = await SessionKey.create({
  address: keypair.toSuiAddress(),
  packageId: config.originalPackageId ?? config.packageId,
  ttlMin: 10,
  signer: keypair,  // or `signer` in the browser
  suiClient: client,
});

// 3. Rebuild the Seal identity and decrypt.
const sealId = buildRecipientFileSealId(result.sealIdPrefix, result.sealNonce);
const plaintext = await seal.decryptUnderRecipientFile(ciphertext, {
  sessionKey,
  sealId,
  fileId: file.id,
});

console.log(new TextDecoder().decode(plaintext));
```

If the session key's address is not in the file's member set, the key servers refuse and the SDK throws `SealError` with code `no-access`. `decodeRecipientFileSealId(id, prefixLength)` splits an identity back into prefix, tag, and nonce when you need to inspect one.

### Listing & discovery

`RecipientFile` objects are *shared*, so they belong to no wallet and never appear in owned-object queries; you cannot enumerate them with `getOwnedObjects`. Discovery is event-based instead: every lifecycle mutation emits an event, and the SDK ships pure reducers that replay an event stream into a current-state list:

```typescript
import {
  buildRecipientFileEventTypes,
  reconcileRecipientFilesAccessibleBy,
  reconcileRecipientFilesOwnedBy,
} from "@arcadiasystems/morse-sdk";

// Event types are rooted at the package where the module was FIRST
// defined - NOT the current packageId, which moves on every upgrade.
const types = buildRecipientFileEventTypes(
  config.recipientFileEventOriginPackageId ?? config.packageId,
);

// Fetch events of these types from your event source (Sui GraphQL or an indexer),
// normalized to { type, json, timestampMs }, oldest first. Then reduce:
const owned = reconcileRecipientFilesOwnedBy(events, myAddress, types);
const accessible = reconcileRecipientFilesAccessibleBy(events, myAddress, types);
// Both return RecipientFileSummary[] - no blobId/blobObjectId. Hydrate
// individual files via filesReader.getRecipientFile(summary.id).
```

The reducers handle creation, metadata updates, recipient add/remove, ownership transfer, and deletion. One known gap: `reconcileRecipientFilesOwnedBy` does not add files transferred *to* the queried address, because the transfer event does not carry the file's metadata. Re-fetch those with `getRecipientFile`. The CLI's `morse file list` uses these same reducers over events read from Sui GraphQL (the canonical Mysten endpoint for the network by default; pass `--indexer-url` to point at another GraphQL endpoint, which localnet requires).

### Types & config reference

| Export | What it is |
| --- | --- |
| `RecipientFileId` | Branded string for a `RecipientFile` object ID. Validate with `toRecipientFileId()`. |
| `RecipientFile` | Full live-object record: `id`, `owner`, `blobId`, `blobObjectId`, `name`, `contentType`, `size`, `members`, `createdAtMs`. |
| `RecipientFileSummary` | Event-derived view (`kind: "summary"`). Missing `blobId` / `blobObjectId`; hydrate when needed. |
| `RecipientFileFull` / `RecipientFileSummaryOrFull` | Hydrated variant (`kind: "full"`) and the discriminated union the list flows return. |
| `MorseRecipientFileConfig` | Config slice for recipient-file ops: `packageId`, `originalPackageId`, `recipientFileEventOriginPackageId`. Satisfied by `morseConfig({ network })`. |
| `SealPolicyTag` | Policy tag constants: `Publisher = 1`, `RecipientFile = 3`. |

The `recipientFileEventOriginPackageId` field exists because Sui stamps events (and created-object types) with the package address where a struct was *first* defined. The `recipient_file` module arrived in a later upgrade than the publication modules, so it has its own origin address, distinct from both `packageId` (current published-at) and `originalPackageId` (v1 genesis). `morseConfig({ network: "testnet" })` carries the correct value; only custom deployments need to set it.

## Costs

Measured on Sui testnet against the production package (2026-07-27, 127-byte file). Walrus storage is paid separately in WAL at upload time:

| Operation | Gas (MIST) | Gas (SUI) |
| --- | --- | --- |
| `file upload --encrypt` (certify + create + share PTB) | 6,591,240 | ~0.0066 |
| `file recipient add` | 1,280,668 | ~0.0013 |
| `file recipient remove` | 796,700 | ~0.0008 |

Decryption costs no gas: the `seal_approve` dry-run happens on the key servers' side and nothing is executed on-chain.

## Error codes

Move abort codes from the `recipient_file` module. The SDK surfaces them as `ContractAbortError`; Seal-side failures surface as `SealError` with codes `no-access`, `decrypt-failed`, `session-expired`, or `rate-limited`.

| Code | Constant | Meaning |
| --- | --- | --- |
| `0` | `EUnauthorized` | Sender is not the file owner |
| `1` | `EBlobIdEmpty` | `blob_id` must be non-empty |
| `2` | `ENameInvalid` | `name` is empty or over 256 characters |
| `3` | `EContentTypeInvalid` | `content_type` is empty or over 255 characters |
| `4` | `ERecipientAlreadyPresent` | Address is already a recipient |
| `5` | `ERecipientNotPresent` | Address is not a recipient |
| `6` | `ESealInvalidId` | Seal identity does not match this file's namespace |
| `7` | `ESealWrongPolicyTag` | Seal identity does not carry policy tag `3` |
| `8` | `ENoAccess` | Sender is not in the file's member set (raised in the `seal_approve` dry-run; clients see `SealError("no-access")`) |
| `9` | `ESealPrefixEmpty` | Caller-supplied `seal_id_prefix` is empty |
| `10` | `ESealPrefixMissing` | File has no attached seal prefix; `seal_approve_with_prefix` cannot apply |
