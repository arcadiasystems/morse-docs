> Source: https://morse-docs.vercel.app/access-control.html · Full docs: https://morse-docs.vercel.app/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/MandaWeb3/morse-docs/issues/new?labels=docs-feedback

# Access Control

> Morse uses a capability-based permission model. Two types of capabilities control who can administer a publication and who can write content - enforced on-chain by the Sui type system, with no off-chain authorization service.

## Overview

Every write operation in Morse requires presenting a valid capability object. Capabilities cannot be fabricated - they can only be created by the protocol through designated functions. The type system itself is the enforcement mechanism.

## OwnerCap

The `OwnerCap` is the highest-authority object in a publication. Exactly one exists per publication - it is created alongside the publication and transferred to the creator.

```move
public struct OwnerCap has key {
  id: UID,
  publication_id: ID,   // which publication this cap administers
}
```

Operations that require `OwnerCap`:

- `issue_publisher_cap` - mint a new publisher cap for an address
- `revoke_publisher_cap` - add a cap ID to the revocation denylist
- `delete_publication` - delete the publication entirely
- `transfer_owner_cap` - transfer ownership to a new address

> **INFO: `OwnerCap` is transferable by design**
>
> Ownership can be sold, transferred to a multisig wallet, or handed to a DAO treasury. This is a protocol-level feature, not a limitation - publication identity lives in the contract, not in a centralized identity system.

## PublisherCap

Publisher caps grant write access for daily content operations. Many can exist per publication, issued to different addresses for different editors or automation agents.

```move
public struct PublisherCap has key {
  id: UID,
  publication_id: ID,   // scoped to this publication
  holder: address,      // only this address may use this cap
}
```

Every write operation that uses a `PublisherCap` runs three checks internally:

```move - internal validation
assert!(cap.publication_id == object::id(publication), EUnauthorized);
assert!(cap.holder == ctx.sender(), EPublisherCapWrongHolder);
assert!(!publication.revoked_publisher_caps.contains(object::id(cap)), EPublisherCapRevoked);
```

The `holder` field is critical: it binds the capability to a specific address. If someone holds the `PublisherCap` object but the transaction is not signed by `holder`, the write is rejected. You cannot use a single publisher cap from multiple wallets.

## Issuing Publisher Caps

Only the owner can issue publisher caps. The owner specifies the target `holder` address - the cap is created and delivered in a single command:

**CLI:**

```bash
morse cap issue <holder>
```

```example
morse cap issue 0x71a3...9f2b
```

```output
Issued PublisherCap 0x9c0d...1e2f to 0x71a3...9f2b. (tx: AbCdEf...)
```

**SDK:**

```typescript
import { issuePublisherCap } from "@arcadiasystems/morse-sdk";

// See sdk-client-setup.html for adapter and config initialization
// publicationId and ownerCapId come from createPublication() - see Publications page
const result = await issuePublisherCap(adapter, config, {
  publicationId: "0x1a2b...3c4d",
  ownerCapId: "0x5e6f...",
  holder: "0x71a3...9f2b",
});
// result → { publisherCapId, digest, gasUsedMist }
```

**Move:**

```move
// Step 1: create the cap (returns it to the caller)
public fun issue_publisher_cap(
  publication: &mut Publication,
  owner_cap: &OwnerCap,
  holder: address,
  ctx: &mut TxContext,
): PublisherCap

// Step 2: deliver the cap to the holder
public fun transfer_publisher_cap(cap: PublisherCap, recipient: address)
```

Use [SDK Setup → morseConfig()](https://morse-docs.vercel.app/sdk-client-setup.html#morse-config) to get the package ID and registry ID, [SDK Setup → Server Setup](https://morse-docs.vercel.app/sdk-client-setup.html#server-setup) to initialize the client, and [Contract Cookbooks](https://morse-docs.vercel.app/contracts-workflows.html) for complete PTB examples.

### Ownership vs holder binding

A `PublisherCap` has two layers of authorization that must both be satisfied:

- **Sui object ownership** - which wallet physically holds the cap object. This determines who can pass it into a transaction.
- **`holder` binding** - an address set permanently at issuance. The contract checks `cap.holder == ctx.sender()` on every write operation.

Both must match for the cap to work. Transferring a cap to someone who is not the bound `holder` gives them the object, but the contract will still reject their writes.

### The `transfer_publisher_cap` function

At the Move level, `issue_publisher_cap` returns the cap to the caller without delivering it. A separate `transfer_publisher_cap` call moves the object to the intended recipient. The CLI and SDK bundle both calls into a single atomic transaction, so the publisher receives the cap immediately when you run `morse cap issue`.

The CLI also exposes `morse cap transfer` as a standalone command for manually re-sending an existing cap, but this is rarely needed in practice since issuance handles delivery automatically.

> **WARNING: Transfer to a non-holder creates a dead object**
>
> Transferring a cap to an address that is not the bound `holder`, the cap becomes permanently stuck: the recipient owns the Sui object but write and destroy fail the `holder` check, and the original holder can no longer access the object. To rotate access to a new address, destroy the old cap and have the owner issue a new one.

### Under the hood

When you issue a cap via the CLI or SDK, two Move calls are bundled in a single transaction:

1. `issue_publisher_cap` creates the cap and binds it to the `holder` address.
2. `transfer_publisher_cap` delivers the cap object to that address.

**No table write occurs during issuance** - only revocations write to the denylist. This makes issuing caps essentially free beyond the gas cost of object creation.

## Revoking Publisher Caps

When a publisher needs to be removed, the owner calls `revoke_publisher_cap` with the cap's object ID:

**CLI:**

Pass `-y` before the subcommand to skip the prompt (e.g. `morse -y cap revoke <id>`).

```bash
morse cap revoke <publisherCapId>
```

```example
morse cap revoke 0x9c0d...1e2f
```

```output
Revoked PublisherCap 0x9c0d...1e2f. (tx: AbCdEf...)
```

**SDK:**

```typescript
import { revokePublisherCap } from "@arcadiasystems/morse-sdk";

await revokePublisherCap(adapter, config, {
  publicationId: "0x1a2b...3c4d",
  ownerCapId: "0x5e6f...",
  publisherCapId: "0x9c0d...1e2f",
});
```

**Move:**

```move
public fun revoke_publisher_cap(
  publication: &mut Publication,
  owner_cap: &OwnerCap,
  cap_id: ID,     // object ID of the PublisherCap to revoke
)
```

This adds the cap ID to the `revoked_publisher_caps: Table<ID, bool>` denylist on the publication. All subsequent writes using that cap will be rejected - the revocation is immediate and requires no cooperation from the cap holder.

> **WARNING: Double-revoke aborts**
>
> Calling `revoke_publisher_cap` on an already-revoked cap ID aborts with `EPublisherCapRevoked`. Check the denylist state before revoking if unsure.

### The Denylist Model

Morse uses a **denylist** (blocklist), not an allowlist, for publisher cap tracking. This is a deliberate design choice:

|  | Denylist (Morse) | Allowlist (alternative) |
| --- | --- | --- |
| Issue cap | Zero table writes | One table write per issuance |
| Revoke cap | One table write | One table delete |
| Write validation | One table lookup | One table lookup |
| Optimized for | Common case (no revocations) | Frequent churn |

This is safe because `PublisherCap` has no `store` ability and no external constructor - caps cannot be forged outside the module. An attacker cannot create a valid-looking cap; they must obtain a real one from the owner.

## Destroying Publisher Caps

A publisher can voluntarily surrender their write access by calling `destroy_publisher_cap`:

**CLI:**

Pass `-y` before the subcommand to skip the prompt (e.g. `morse -y cap destroy <id>`).

```bash
morse cap destroy <publisherCapId>
```

```example
morse cap destroy 0x9c0d...1e2f
```

```output
Destroyed PublisherCap 0x9c0d...1e2f. (tx: AbCdEf...)
```

**SDK:**

```typescript
import { destroyPublisherCap } from "@arcadiasystems/morse-sdk";

await destroyPublisherCap(adapter, config, {
  publicationId: "0x1a2b...3c4d",
  publisherCapId: "0x9c0d...1e2f",
});
```

**Move:**

```move
public fun destroy_publisher_cap(
  publication: &mut Publication,
  cap: PublisherCap,    // consumed
  ctx: &mut TxContext,
)
```

Only the `holder` can call this. The cap is permanently deleted from Sui and can never be used again. If it was previously revoked, the denylist entry is also removed to free on-chain storage.

## Seal Integration

Morse integrates with **Seal** - Mysten's on-chain access control layer - to gate decryption of encrypted entry payloads. The integration is implemented via an `entry fun` that Seal calls during the decryption approval flow.

### Decryption Sequence

When a reader wants to decrypt an encrypted entry, the SDK and Seal key servers coordinate a multi-step flow:

1. **Client creates a `SessionKey`** - the reader's wallet signs a personal message to produce a time-limited `SessionKey` scoped to the contract's `originalPackageId` (the stable genesis address that survives upgrades).
2. **SDK builds an approval transaction** - `seal.decrypt()` decodes the `sealId` to extract the target `publicationId`, then constructs a Programmable Transaction Block (PTB) that calls `seal_approve_publisher` with the `sealId`, the `Publication` object, and the caller's `PublisherCap`.
3. **SDK sends the request to Seal key servers** - the serialized PTB bytes, the ciphertext, and the `SessionKey` are sent to the configured Seal key servers.
4. **Key servers dry-run the approval on-chain** - each key server executes the PTB against the current chain state. The Move function runs two checks (see below). If either check fails the key server refuses to release its share.
5. **Key servers return threshold decryption shares** - once at least *threshold* servers (default 2) confirm approval, each returns its decryption key share to the client.
6. **Client decrypts locally** - the `SealClient` combines the shares and decrypts the Walrus blob ciphertext on the reader's device.

### Approval Function

The on-chain function that Seal key servers dry-run during step 4:

```move
entry fun seal_approve_publisher(
  id: vector<u8>,         // Seal identity being approved
  publication: &Publication,
  cap: &PublisherCap,
  ctx: &TxContext,
)
```

The function runs two checks:

1. `assert_active_publisher_cap` - verifies the cap is valid, not revoked, and the sender is the holder
2. `assert_valid_publisher_seal_id` - verifies the Seal identity is scoped to this publication and policy

### Seal Identity Format

Seal identities for Morse follow a structured namespace format to prevent cross-publication identity reuse:

```
┌─────────────────────────────────┬────────────────┬──────────────────┐
│  publication_id bytes (32)       │ policy_tag (1)  │ nonce (variable) │
└─────────────────────────────────┴────────────────┴──────────────────┘
  Scopes identity to one           Must be 0x01      Differentiates
  specific publication             for publisher      multiple identities
                                   policy             under same namespace
```

The `policy_tag = 0x01` is the publisher policy tag. This namespacing ensures:

- A cap for Publication A cannot approve decryption of Publication B content
- The same publication can host multiple policy types with different tags in the future (e.g. subscription tag)
- Many unique Seal identities can exist within one publication namespace (via different nonces)

## Access Policies

Every revision stored on-chain carries an `access_policy` field that determines who can read the content payload. The Move contract validates the policy value, encryption flag, and Seal identity together at write time - invalid combinations abort the transaction.

| Policy | Value | Encrypted | Who can read | Enforcement |
| --- | --- | --- | --- | --- |
| **Public** | `0` | No | Anyone. The Walrus blob is readable directly by blob ID. | `encrypted` must be `false`, `seal_id` must be absent. Enforced at write time by the entry module. |
| **Publisher** | `1` | Yes | Holders of an active (non-revoked) `PublisherCap` for the publication. | `encrypted` must be `true`, `seal_id` required. Decryption gated on-chain by `seal_approve_publisher` (see [Seal Integration](#seal-integration) above). |
| **Subscription** | `2` | - | Planned: subscribers who hold a valid subscription token. | Reserved. The constant is defined and the value is stored correctly on-chain, but no `seal_approve_subscription` entry function exists yet. |

> **WARNING: Policy and encryption are coupled**
>
> Public revisions must be unencrypted; publisher revisions must be encrypted with a Seal identity. The contract rejects mismatches at write time. See [Entries → Error Codes](https://morse-docs.vercel.app/entries.html#error-codes) for the specific error constants.

## Real-World Usage Pattern

1. **Publication created**
   Owner wallet creates the publication. Receives `OwnerCap` (kept in owner wallet) and an initial `PublisherCap` (also kept or immediately transferred).

2. **Onboard editors**
   For each editor or automation agent, the owner calls `issue_publisher_cap(holder: editor_address)` and transfers the returned cap to that address. Each cap is independent - revoking one does not affect others.

3. **Editors publish content**
   Editors present their `PublisherCap` in PTBs to create collections, add entries, append drafts, and publish. The contract verifies sender matches `holder` on every call.

4. **Offboard editors**
   When an editor leaves, the owner calls `revoke_publisher_cap(cap_id)`. The revocation is immediate - the next write attempt using that cap aborts. Historical content is unaffected.

5. **Transfer ownership (optional)**
   The owner calls `transfer_owner_cap(owner_cap, new_owner_address)`. The new owner gains full admin authority immediately. The old owner retains only their `PublisherCap` (if any) unless it is revoked by the new owner. See [Publications → Ownership Transfer](https://morse-docs.vercel.app/publications.html#ownership-transfer) for details.

## Error Codes

For more error codes, see: [Publications](https://morse-docs.vercel.app/publications.html#error-codes), [Collections](https://morse-docs.vercel.app/collections.html#error-codes), [Entries](https://morse-docs.vercel.app/entries.html#error-codes).

| Code | Constant | Meaning |
| --- | --- | --- |
| `2` | `EUnauthorized` | Capability does not belong to this publication |
| `4` | `EPublisherCapWrongHolder` | Transaction sender is not the cap's bound holder address |
| `5` | `EPublisherCapRevoked` | The cap ID is on the revocation denylist |
| `12` | `ESealInvalidId` | Seal identity does not match this publication's namespace |
| `13` | `ESealWrongPolicyTag` | Seal identity has an unsupported policy tag byte |
