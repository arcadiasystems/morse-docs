> Source: https://docs.morsecms.xyz/cli-workflows.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# CLI Cookbooks

> End-to-end recipes for `morse-cli`: publish content, read it back, encrypt and decrypt, delegate write access, and script it in CI. These use the active context, so most commands need no object IDs. For the full per-command reference, see [CLI Command Reference](https://docs.morsecms.xyz/cli-commands.html).

## Prerequisites

| Requirement | Details | Purpose |
| --- | --- | --- |
| Bun or Node | v1.2+ / ≥ 18 | JavaScript runtime |
| Sui wallet | Sui Wallet, Suiet, or any Sui-compatible wallet | Signing transactions on testnet |
| SUI + WAL tokens | [SUI faucet](https://faucet.sui.io/) · [Swap SUI for WAL](https://stake-wal.wal.app/?network=testnet) | Gas fees (SUI) and Walrus storage fees (WAL) |
| Bech32 private key | A `suiprivkey1...` string | CLI authentication. Export from your wallet's settings |

Make sure the CLI is installed and your account is imported before continuing. See [CLI Overview](https://docs.morsecms.xyz/cli-overview.html) for setup.

## Publishing your first entry

Create a profile, import a key, then create a publication and a collection. Each `create` command selects the new object as the active one, so the steps after require no IDs. 
`account import` will prompt for your private key and a keystore password. The collection defaults to `blob` mode when `--mode` is omitted.

```bash
morse config add testnet --network testnet
morse account import
morse publication create --name "My Blog" --slug "my-blog-$(date +%s)"
morse collection create posts

echo "hello morse" > post.md
morse entry add hello --file post.md
```

```output
Uploading 12 bytes to Walrus...
Added entry #0 "hello". (tx: D9Yfjk...)
  view: https://aggregator.walrus-testnet.walrus.space/v1/blobs/0iKeii...
```

A publication's name and slug are immutable on-chain (the slug is the registry's unique key), so there is no rename command.

Check the active context any time with `morse status`; switch the active publication (and collection) with `morse use <slug> [collection]`.

See also: [SDK Cookbooks → Creating a publication](https://docs.morsecms.xyz/sdk-workflows.html#creating-a-publication)

## Reading it back

`entry get` shows metadata; `entry read` fetches the public content itself. The `view` link printed by `entry add` opens the same bytes in a browser.

```bash
morse entry get 0
morse entry read 0 --via-aggregator
morse entry read 0 --via-aggregator --out got.md
```

> **WARNING: Use `--via-aggregator` for reads on testnet**
>
> On testnet, the default direct-node read path frequently fails right after an upload with `No valid blob metadata could be retrieved from any storage node`, even though the blob is healthy, on both plain reads and encrypted decrypts. Add `--via-aggregator` to `entry read` and `entry decrypt` to route through the Walrus aggregator, which succeeds against the same blobs. The tradeoff: the aggregator path skips client-side blob verification, so you trust the operator's bytes. This applies to testnet only; mainnet storage nodes are expected to be more reliable.

See also: [SDK Cookbooks → Reading it back](https://docs.morsecms.xyz/sdk-workflows.html#reading-it-back)

## Listing your content

List your publications, collections, and entries in the active context.

```bash
morse publication list
morse collection list
morse entry list
morse status
```

## Publishing a new revision

Append a new public revision directly, or stage a draft first and promote it. Revisions are append-only; existing revisions are never edited in place. Two heads track progress: `draftHead` (work in progress) and `publicHead` (the live version).

### Option A: publish direct

Skip the draft stage and append a new public revision in one step. This updates `publicHead` immediately.

```bash
echo "hello morse, edited" > post.md
morse revision publish-direct 0 --file post.md
```

### Option B: draft then publish

Stage a draft revision first (updates `draftHead` only), then promote it to a public revision. By default, `publish-from-draft` reuses the draft's content; pass `--file` to replace it with new content. Useful when you want to review before going live.

```bash
echo "hello morse, draft" > draft.md
morse revision append-draft 0 --file draft.md
morse revision publish-from-draft 0 1
```

See also: [SDK Cookbooks → Publishing a new revision](https://docs.morsecms.xyz/sdk-workflows.html#publishing-a-new-revision)

## Encrypted content

Morse uses [Seal](https://docs.morsecms.xyz/access-control.html#seal-integration) for on-chain access control over encrypted content. When you add an encrypted entry, the CLI handles Seal key negotiation automatically.

```bash
echo "members only" > secret.txt
morse entry add-encrypted members --file secret.txt
morse entry decrypt 1 --via-aggregator --out recovered.txt
```

> **WARNING: Encrypted entries are always drafts**
>
> Encrypted entries are always created as drafts. You must explicitly publish them with a separate transaction after adding. Retrieve encrypted content with `entry decrypt` plus a PublisherCap, not `entry read`. See [Entries](https://docs.morsecms.xyz/entries.html#adding-an-entry) for why encrypted entries bypass the public head.

See also: [SDK Cookbooks → Encrypted content](https://docs.morsecms.xyz/sdk-workflows.html#encrypted-content)

## Delegating write access

Morse separates ownership (`OwnerCap`) from publishing (`PublisherCap`). The owner issues a cap bound to a co-author's address, granting them write access. Once issued, the co-author can publish entries using their own key. Revoking the cap causes further writes to abort on-chain. See [Access Control → Issuing publisher caps](https://docs.morsecms.xyz/access-control.html#issuing-publisher-caps) for details.

As the **owner**, issue a cap to grant write access and revoke it to remove access:

```bash
morse cap issue 0xCO_AUTHOR_ADDRESS
morse cap revoke 0xCAP_ID
```

As a **cap holder**, list your caps or permanently destroy a specific cap:

```bash
morse cap list
morse cap destroy 0xCAP_ID
```

To rotate a cap to a different address, destroy the old one and have the owner issue a new cap to the new address. Do not use `morse cap transfer` to send a cap to a different holder. The on-chain `holder` binding is immutable, so the recipient would own the object but be unable to use or destroy it.

See also: [SDK Cookbooks → Delegating write access](https://docs.morsecms.xyz/sdk-workflows.html#delegating-write-access)

## Transferring ownership

The owner can transfer the publication's `OwnerCap` to another address, handing over full governance: the recipient becomes the new owner and can issue, revoke, and manage caps.

```bash
morse publication transfer-ownership 0xNEW_OWNER
```

> **WARNING: One-way for the sender**
>
> Once transferred, the original owner loses all governance rights immediately. The new owner could transfer back, but there is no built-in undo.

See also: [SDK Cookbooks → Transferring ownership](https://docs.morsecms.xyz/sdk-workflows.html#transferring-ownership)

## Deleting and tearing down

Deletion is bottom-up: remove entries first, then collections, then the publication. Each container must be empty before it can be deleted. Entry IDs are permanently retired on deletion and never reused. See [Entries → Deleting an entry](https://docs.morsecms.xyz/entries.html#deleting-an-entry) for details.

```bash
morse entry delete 0
morse entry delete 1
morse collection delete posts
morse publication delete
```

See also: [SDK Cookbooks → Deleting and tearing down](https://docs.morsecms.xyz/sdk-workflows.html#deleting-and-tearing-down)

## Scripting and CI

Authenticate with env vars (no prompts), skip confirmations with `--yes`, and parse `--json` on stdout. Reads by object ID never need a key; slug-based reads still require an account address for resolution.

```bash
export MORSE_PRIVATE_KEY=suiprivkey1...
export MORSE_NETWORK=testnet

pub=$(morse --json publication create --name CI --slug "ci-$(date +%s)" | jq -r .publicationId)
echo "created $pub"
morse --yes publication delete "$pub"

morse publication get 0x00 || echo "exit $?"
```

## Troubleshooting

| Code | Message | Cause |
| --- | --- | --- |
| `2` | No account selected | No key configured. Import one, set `MORSE_PRIVATE_KEY`, or run `account use`. |
| `4` | Incorrect password or corrupted keystore | Wrong keystore password (GCM auth-tag mismatch). |
| `2` | No publication selected | No active publication. Pass `-P <slug\|id>` or run `morse use`. |
| `3` | No publication at 0x… | The ID does not exist on this network. |
| `5` | Move abort `ESlugAlreadyExists` | The slug is already registered; slugs are globally unique on the network. Re-run with a different slug (e.g. append a timestamp). |
| `5` | Too many failures while writing blob to nodes | Walrus storage nodes are degraded. Retry; check WAL balance. |
| `2` | Morse is not yet deployed on mainnet | Use `--network testnet`. |
| `5` | InsufficientGas / out of SUI gas | The active account does not have enough SUI for gas fees. Run `sui client faucet` to request testnet SUI. |
| `5` | Insufficient WAL balance | Walrus storage requires WAL tokens. Get WAL from the [Walrus testnet faucet](https://stake-wal.wal.app/?network=testnet). |
| `5` | No valid blob metadata could be retrieved from any storage node | Common on testnet, especially right after an upload. The default direct-node read path fails even for healthy blobs. Re-run with `--via-aggregator`. See [Reading It Back](#reading-it-back). |
| `5` | Walrus blob not retrievable / blob expired | The blob's storage epoch has ended and it is no longer available on Walrus storage nodes. Re-upload the content and create a new revision with a longer `--epochs` value. |

## Next steps

- [SDK: Overview](https://docs.morsecms.xyz/sdk-overview.html): TypeScript client setup, publishing, reading, and encryption via the SDK.
- [Smart Contracts: Overview](https://docs.morsecms.xyz/contracts-overview.html): On-chain modules, object model, and the Move API behind Morse dCMS.
