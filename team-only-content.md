> Source: https://docs.morsecms.xyz/team-only-content.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Encrypt a post for your team

> Client-side encryption with the access rule living on Sui. Who can read is who holds a live cap, and revoking is one command.

- About 10 minutes
- CLI
- A publication with a blob collection
- Testnet

## What encryption gives you today

Morse encrypts content client side with [Seal](https://seal-docs.wal.app/) before it goes to Walrus. The decryption rule is a Move function on Sui: a Seal key server only releases its share if the caller holds an active `PublisherCap` for that publication. So today, encrypted means **readable by your team**: everyone with write access, nobody else, and no server of yours in the middle.

| Policy | Who can read | Status |
| --- | --- | --- |
| Public (0) | Anyone with the blob id | Live |
| Publisher (1) | Active `PublisherCap` holders of the publication | Live, this recipe |
| Subscription (2) | Holders of a subscription token | Reserved on chain, approval function not built yet |

## Publish an encrypted entry

With your publication and collection active:

```bash
$ cat > q4-plan.md <<'EOF'
# Q4 plan (internal)
Ship mainnet, then the indexer.
EOF
$ morse entry add-encrypted q4-plan --file q4-plan.md --epochs 30
```

```output
Encrypting and uploading 53 bytes...
Added encrypted entry #5 "q4-plan". (tx: 8Bq1mVr0...2kLs)
  network:      testnet
```

Three things happened: the CLI generated a fresh Seal identity scoped to your publication, encrypted the file locally, and uploaded only ciphertext. The entry was created as a **draft**. Encrypted entries always start as drafts, because publishing is a separate decision.

> **INFO: Collection mode**
>
> Encrypted entries need a `blob` mode collection, which is the default. If you created the collection with `--mode quilt`, make another one for encrypted content.

## Read it as a cap holder

Reading is `entry decrypt`, not `entry read`. The CLI signs a short-lived session key with your account, asks the key servers for shares, and decrypts locally.

```bash
$ morse entry decrypt 5 --via-aggregator --out q4-plan.recovered.md
$ diff q4-plan.md q4-plan.recovered.md && echo identical
```

Anyone you issued a cap to in [Add a co-author](https://docs.morsecms.xyz/co-author.html) can run the same command from their own wallet. Anyone else gets the ciphertext from Walrus and nothing from the key servers.

## Release it to everyone

A draft is visible as an entry on chain but is not the public head, and for encrypted content it stays that way: published revisions are always public and unencrypted, so the team keeps reading the draft with `entry decrypt`. The CLI will not add a public revision to an encrypted entry. Both of these exit with code 2 and "Encrypted revisions are not yet supported":

```bash
$ morse revision publish-from-draft 5 0 --file q4-plan.md   # refused
$ morse revision publish-direct 5 --file q4-plan.md         # refused
```

To release the text, publish the plaintext as a new, ordinary entry with `morse entry add q4-plan-public --file q4-plan.md --epochs 30`. The encrypted entry stays a team-only draft.

## Rotate a key, revoke a reader

Access is enforced at decryption time, every time. Revoking a cap cuts off a reader even for content they could read yesterday:

```bash
$ morse cap revoke 0xTHEIR_CAP_ID
```

Note what this does and does not do. It stops the key servers from serving that wallet from now on. It does not un-read anything they already decrypted and saved. Same as any system, but worth saying out loud to a team.

## Honest limits

| Question | Answer today |
| --- | --- |
| Can I sell access to a post? | Not yet. The subscription policy exists on chain but its approval function is not built. It is on the roadmap. |
| Can a reader get read access without write access? | Not with Seal gating. A `PublisherCap` is both. Keep the team small. |
| Who runs the key servers? | Seal key servers on testnet, two of three shares needed by default. If they are down, nobody can decrypt, including you. |
| Is the ciphertext safe on Walrus? | Walrus stores the bytes anyone can fetch. The key never leaves the key servers and your client. |

## Next

- [Add a co-author](https://docs.morsecms.xyz/co-author.html): Issue the caps your readers need.
- [Fix a typo without losing history](https://docs.morsecms.xyz/fix-a-typo.html): Drafts and heads explained.
- [Access control reference](https://docs.morsecms.xyz/access-control.html): seal_approve_publisher and friends.
