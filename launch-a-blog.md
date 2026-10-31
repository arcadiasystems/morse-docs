> Source: https://docs.morsecms.xyz/launch-a-blog.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Launch a blog in 10 minutes

> Zero to a post whose bytes are on Walrus and whose record is on Sui, with nothing but your terminal. About ten minutes, most of it waiting for a faucet.

- About 10 minutes
- CLI only
- Fresh Sui wallet
- Testnet

> **WARNING: Runs on testnet**
>
> Everything here runs on Sui testnet and Walrus testnet. Testnets reset from time to time, and blobs expire when their storage epochs run out. Testnet tokens have no value. Morse also runs on Walrus Mainnet, where the same steps cost real SUI and WAL, so get them working here first. Do not publish anything you cannot afford to lose.

## What you will have

A publication on Sui that you own, one collection called `posts`, and one post whose body lives on Walrus and whose record lives on Sui. Nothing else: no server, no database, no account with us.

| You end up with | Where it lives | How you prove it |
| --- | --- | --- |
| A Publication object | Sui testnet | Its object id, shown by `morse publication get` |
| A `posts` collection | Sui testnet, inside the publication | `morse collection list` |
| Entry `0` with one public revision | Record on Sui, bytes on Walrus | `morse entry get 0` and the blob id |

## Get a wallet and testnet tokens

You need a Sui address with a little SUI for gas and a little WAL for storage. Both are free on testnet and take about two minutes.

| Step | Where | Why |
| --- | --- | --- |
| Install a wallet | Slush, Suiet, or any Sui Wallet Standard wallet | Holds your key and signs |
| Get testnet SUI | [faucet.sui.io](https://faucet.sui.io/) | Gas for every on-chain action |
| Swap a little SUI for WAL | [stake-wal.wal.app](https://stake-wal.wal.app/?network=testnet) | Walrus storage fees when you publish |
| Export your private key | Wallet settings | A `suiprivkey1...` string the CLI can import |

> **INFO: Use a throwaway key**
>
> Create a fresh wallet for Morse testnet. The CLI stores the key in an encrypted keystore under `~/.config/morse/keystores`, but a key you only use for testnet is one less thing to worry about.

## Install the CLI

```bash
$ npm i -g @arcadiasystems/morse-cli
$ morse --version
```

If you would rather not install anything, every command below also works as `npx @arcadiasystems/morse-cli ...`.

## Point it at testnet and import your key

```bash
$ morse config add testnet --network testnet
$ morse account import
```

`account import` asks for the `suiprivkey1...` string and a password, both hidden. Check that it took:

```bash
$ morse status
```

```output
profile:     testnet
network:     testnet
account:     0x7be4...11d0
publication: (none)
collection:  (none)
```

## Create the publication

Slugs are globally unique on the network, so add a suffix. The name and slug cannot be changed later, pick ones you like.

```bash
$ morse publication create --name "My Blog" --slug "my-blog-$(date +%s)"
$ morse collection create posts
```

Both commands set what they created as your active context, so you do not have to pass `-P` or `-C` on every call. Two transactions have been signed with your key: one created the publication and minted your `OwnerCap` and `PublisherCap`, the other added the collection.

## Write and publish the first post

A post is just a file. Markdown is a good default because every reader can render it.

```bash
$ cat > hello.md <<'EOF'
# Hello from Morse

This post has no backend. Its bytes are on Walrus, its record is on Sui.
EOF
$ morse entry add hello --file hello.md --epochs 14
```

`--epochs` is how long Walrus keeps the blob. The default is 3, which is about three days on testnet. Fourteen is enough for a demo you want to show people next week. The content type is inferred from the file extension.

```output
Uploading 93 bytes to Walrus...
Added entry #0 "hello". (tx: D9YfjkA3...9vB)
  network:      testnet
  view: https://aggregator.walrus-testnet.walrus.space/v1/blobs/0iKeiiQ2...m7Xp
```

> **INFO: Two transactions, one command**
>
> `entry add` uploads the bytes to Walrus and registers the blob, then records the entry on Sui. If the second step fails you will see an error naming the blob that was already uploaded; rerun the command, the blob is not lost.

## Read it back

```bash
$ morse entry read 0
```

The CLI reads the post from the Walrus storage nodes and checks the bytes against the blob id recorded on Sui.

## Share the record

This is the part a hosted CMS cannot do. Print the record and hand it to anyone:

```bash
$ morse --json entry get 0 | jq .
```

The output includes the public head and the revision list, and for each revision the address that wrote it and the Sui object id of its Walrus blob. Paste your publication id (`morse status` shows it) into [suiscan.xyz/testnet](https://suiscan.xyz/testnet/home) and anyone can see who published to it and when, without a Morse account, without trusting you.

> **TIP: You are live**
>
> Your publication, collection and first post exist on Sui testnet. Run `morse entry list` to see them, or go straight to [Fix a typo without losing history](https://docs.morsecms.xyz/fix-a-typo.html) for the second thing every blog needs.

## If something fails

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `exit 2` and "No account selected" on `publication create` | No active account, or wrong profile | `morse status`, then `morse account use <address>` |
| Insufficient gas / balance | No SUI or no WAL on the address | Faucet for SUI, swap for WAL, check the address matches `morse status` |
| `ESlugAlreadyExists` | Someone used that slug | Add a suffix, the `$(date +%s)` trick above does this |
| `entry read` exits 3 and says no valid blob metadata | A bug in the verified read in morse-cli 0.10.1, not a timing issue | Upgrade to morse-cli 0.11.0; waiting does not help |
| `entry read` exits 5 and says to retry or pass `--via-aggregator` | The storage nodes did not return the content; the blob may be healthy | Retry, or add `--via-aggregator` to read through a Walrus aggregator |
| Post disappeared after a while | Blob epochs expired or testnet reset | Republish with a larger `--epochs`; the entry record on Sui is unaffected |

## Next

- [Fix a typo without losing history](https://docs.morsecms.xyz/fix-a-typo.html): Publish a second revision and keep the first readable.
- [Import an existing Markdown site](https://docs.morsecms.xyz/import-a-site.html): Loop over a folder of posts and publish them all.
- [Prove a post has not changed](https://docs.morsecms.xyz/verify-a-post.html): Check a post against its Sui record and Walrus blob.
