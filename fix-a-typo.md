> Source: https://docs.morsecms.xyz/fix-a-typo.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Fix a typo without losing history

> Correct a published post without rewriting history. Two ways to do it, and how to read any revision back.

- About 5 minutes
- CLI
- An existing entry
- Testnet

## Why revisions, not edits

Morse never overwrites a post. Every change is a new revision appended to the entry, and every earlier revision stays readable forever. An entry keeps two pointers, the **public head** (what readers get) and the **draft head** (what you are working on). Fixing a typo moves the public head, it does not erase anything.

```text
entry 0
  revision 0   public   "Hello from Morse"           <- still readable
  revision 1   public   "Hello from Morse" (fixed)   <- public head
```

Everything below assumes you have the publication and collection from [Launch a blog](https://docs.morsecms.xyz/launch-a-blog.html) set as your active context. Check with `morse status`.

## Publish a corrected revision in one step

Edit the file, then publish it straight to the public head:

```bash
$ sed -i.bak 's/no backend/no backend at all/' hello.md
$ morse revision publish-direct 0 --file hello.md --epochs 14
```

```output
Uploading 100 bytes to Walrus...
Blob uploaded (0xa3d0...2c1f). Submitting transaction...
Published revision #1 on entry #0. (tx: 7Kq2mRv1...9v8)
```

One upload, one transaction. The old blob and the old revision are untouched.

## Or stage a draft first

For anything bigger than a typo, stage the change as a draft, read it back, and only then publish it. Drafts are real revisions on chain, they are just not the public head.

```bash
$ morse revision append-draft 0 --file hello.md --epochs 14
$ morse entry list --drafts-only
$ morse revision publish-from-draft 0 2
```

The second argument of `publish-from-draft` is the draft revision's index, which `entry list --drafts-only` or `morse entry get 0` shows you. The content is reused as is; pass `--file` if you want to replace it at the moment of publishing.

> **INFO: Encrypted entries always start as drafts**
>
> An entry added with `entry add-encrypted` starts as a draft and stays one: published revisions are always public and unencrypted, so team-only content is read from the draft with `entry decrypt`. See [Encrypt a post for your team](https://docs.morsecms.xyz/team-only-content.html).

## Read any earlier revision

`entry read` takes an optional revision index. Without it you get the public head.

```bash
$ morse entry read 0 --via-aggregator            # public head
$ morse entry read 0 0 --via-aggregator          # revision 0, the original
$ morse entry read 0 0 --via-aggregator --out original.md
$ diff original.md hello.md
```

That diff is the whole point. Anyone with the entry id can produce it, with no help from you.

## What readers see

A reader app that follows the public head sees the corrected post immediately. A reader who cares can fetch the entry record from Sui and walk the revision list, each revision pointing at its own Walrus blob and naming the address that wrote it. The demo blog shows this as a Revisions panel next to the post.

| Operation | Command | Moves public head | Keeps history |
| --- | --- | --- | --- |
| Publish corrected text now | `revision publish-direct` | Yes | Yes |
| Stage, review, then publish | `revision append-draft` + `publish-from-draft` | On publish | Yes |
| Delete the entry | `entry delete` | n/a | No, and the id is retired for good |

> **WARNING: Blobs expire, records do not**
>
> Each revision's bytes live on Walrus for the epochs you paid for. When they expire, the revision record on Sui still exists but the content cannot be fetched. Use a generous `--epochs` for anything you want readable next month, and expect testnet resets.

## Next

- [Prove a post has not changed](https://docs.morsecms.xyz/verify-a-post.html): Compare what a reader got with the chain record.
- [Add a co-author](https://docs.morsecms.xyz/co-author.html): Let someone else publish revisions to your blog.
- [CLI command reference](https://docs.morsecms.xyz/cli-commands.html): Every revision and entry flag.
