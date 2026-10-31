> Source: https://docs.morsecms.xyz/verify-a-post.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Prove a post has not changed

> Three claims, three commands. Verify the bytes, the revision and the author of any post from a clean machine.

- About 10 minutes
- CLI, no key needed
- A publication id and entry id
- Testnet

## What you are checking

A Morse post makes three claims you can test without trusting the publisher or us: the content you are reading is the bytes that were registered, the revision you are reading is the one the publisher marked public, and the wallet that published it is the one that holds a cap. Each claim has a command.

| Claim | Where the proof lives | Command |
| --- | --- | --- |
| These bytes are the registered bytes | The Walrus blob object the revision points to | `entry read` without `--via-aggregator` |
| This is the public revision | Entry record on Sui, inside the collection | `entry get` |
| A cap holder published it | The revision's author on Sui | `entry get`, then `cap list` |

## Get the record

All you need is the publication id, the collection name and the entry id. No key: reads by object id do not use an account.

```bash
$ morse --json entry get 0 -P 0x69d4...f327 -C posts | jq .
```

Keep three values from the output: `publicHead` (the index of the public revision), that revision's `blobRef.blobObjectId` (the Sui object of its Walrus blob) and its `author`. Those three are the record.

## Fetch the bytes two ways

The aggregator is convenient. The direct path is the proof.

```bash
$ morse entry read 0 -P 0x69d4...f327 -C posts --via-aggregator --out a.md     # fast, trusts the aggregator
$ morse entry read 0 -P 0x69d4...f327 -C posts --out b.md                     # verifies against storage nodes
$ cmp a.md b.md && echo "bytes match"
```

Without the flag, the CLI fetches slivers from Walrus storage nodes and checks them against the blob's metadata before writing a byte. If it succeeds, the file matches the blob id on chain. If the bytes had been swapped anywhere, this step fails rather than returning something else.

## Walk the revisions

Every earlier revision is still there. Read the first one and diff it against the current public head:

```bash
$ morse entry read 0 0 -P 0x69d4...f327 -C posts --out v0.md
$ diff v0.md b.md
```

This is what the demo blog's Revisions panel does for a reader with a browser. A reporter, a lawyer or a regulator can do it with these two lines and no relationship to the publisher.

## Check who published it

The record names the wallet that wrote each revision, so no explorer is needed: `jq -r '.revisions[.publicHead].author'` on the `entry get` output prints it. To see the transactions themselves, open the publication id on a Sui explorer, for example `suiscan.xyz/testnet/object/<PUBLICATION_ID>`. Then check that the author held a cap for the publication:

```bash
$ morse cap list 0xAUTHOR_ADDRESS
```

The list includes revoked caps, marked `[revoked]`, so it shows every cap the author was issued, not only the ones that still work. A cap revoked since then is still enough here: the chain rejects any write made with a revoked cap, so a revision that exists was authorised by the owner when it was written.

## Do it from a script

The whole check as one script, suitable for a cron job or a CI step that guards a site built from Morse content:

```bash
#!/usr/bin/env bash
set -euo pipefail
PUB=$1; COL=$2; ENTRY=$3
tmp=$(mktemp -d)
morse --json entry get "$ENTRY" -P "$PUB" -C "$COL" > "$tmp/record.json"
morse -q entry read "$ENTRY" -P "$PUB" -C "$COL" --out "$tmp/verified" \
  || { echo "direct read failed: blob unavailable or expired"; exit 5; }
morse -q entry read "$ENTRY" -P "$PUB" -C "$COL" --via-aggregator --out "$tmp/served"
cmp -s "$tmp/verified" "$tmp/served" && echo "OK: served bytes match the verified blob" \
  || { echo "MISMATCH: aggregator served different bytes"; exit 1; }
```

```bash
$ ./verify.sh 0x69d4...f327 posts 0
```

## Next

- [Fix a typo without losing history](https://docs.morsecms.xyz/fix-a-typo.html): Where revisions come from.
- [Contracts reference](https://docs.morsecms.xyz/contracts-reference.html): The Entry and Revision objects you just read.
- [Core concepts](https://docs.morsecms.xyz/core-concepts.html): Publications, collections, entries, revisions.
