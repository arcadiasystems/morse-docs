> Source: https://docs.morsecms.xyz/co-author.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Add a co-author

> Let a second person publish to your blog without sharing a key, see who can write at any time, and revoke in one command.

- About 10 minutes
- CLI, two machines
- Owner plus one more wallet
- Testnet

## How write access works

There are no user accounts in Morse. Write access is an object. When you created your publication you received an `OwnerCap` (full control) and a `PublisherCap` (can add entries and revisions). To let someone else publish, the owner mints a new `PublisherCap` bound to their address. To take it away, the owner revokes it. The co-author never needs your key, and you never need theirs.

| Capability | Who holds it | Can do |
| --- | --- | --- |
| `OwnerCap` | You, one per publication | Issue and revoke publisher caps, transfer ownership, delete |
| `PublisherCap` | You and anyone you issue one to | Create collections, add entries, append and publish revisions, decrypt team content |
| Nothing | Everyone else | Read public entries |

## Owner: issue a cap

You need the co-author's Sui address. From your machine, with the publication active:

```bash
$ morse status                                   # confirm the active publication
$ morse cap issue 0xCOAUTHOR_ADDRESS
```

```output
Issued PublisherCap 0x3f8a...c21e to 0xCOAUTHOR_ADDRESS. (tx: 4Hn9xT...q2Wd)
```

Save the cap id, you will need it to revoke. The cap is sent to the co-author's address as part of the same transaction, there is nothing for you to hand over.

## Co-author: set up and publish

On the co-author's machine, same setup as [Launch a blog](https://docs.morsecms.xyz/launch-a-blog.html), then point at your publication by slug:

```bash
$ npm i -g @arcadiasystems/morse-cli
$ morse config add testnet --network testnet
$ morse account import
$ morse cap list                                 # the new cap shows up here
$ morse use my-blog-1760000000 posts
$ morse entry add guest-post --file guest-post.md --epochs 14
```

The CLI finds the right `PublisherCap` automatically from the active account. If the co-author holds caps for several publications, `--publisher-cap <id>` picks one explicitly.

> **INFO: Reads by slug need an account, reads by id do not**
>
> `morse use <slug>` resolves the slug through the active account. Anyone can read a publication by object id with no key at all: `morse publication get 0x69d4...f327`.

## Owner: see who can write

```bash
$ morse cap list 0xCOAUTHOR_ADDRESS
```

There is no team page. The list of who can write is the list of live caps, and anyone can query it on chain. That is the audit trail.

## Revoke, and what the co-author sees

```bash
$ morse cap revoke 0x3f8a...c21e
```

From the next transaction on, every write the co-author attempts with that cap aborts on chain with exit code 4. Everything they published before stays. A revoked cap still sits in their wallet as a dead object; they can tidy it with `morse cap destroy 0x3f8a...c21e`.

## Rotate instead of transfer

> **WARNING: Do not transfer caps between people**
>
> A cap's holder is fixed when it is issued. `cap transfer` moves the object but not the binding, so the recipient cannot use it and the original holder cannot either. To hand write access to a new person: owner revokes the old cap, owner issues a new one.

```bash
$ morse cap revoke 0xOLD_CAP_ID
$ morse cap issue 0xNEW_PERSON_ADDRESS
```

Transferring the whole publication is different and final: `morse publication transfer-ownership 0xNEW_OWNER` hands over the `OwnerCap` with no undo. Existing publisher caps keep working until the new owner revokes them.

## Next

- [Encrypt a post for your team](https://docs.morsecms.xyz/team-only-content.html): Cap holders can also decrypt.
- [Let an AI agent publish](https://docs.morsecms.xyz/agent-publishes.html): An agent is just another cap holder.
- [Access control reference](https://docs.morsecms.xyz/access-control.html): Caps, policies and the Move checks behind them.
