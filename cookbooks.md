> Source: https://docs.morsecms.xyz/cookbooks.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Cookbooks

> Eight things people actually want to do with Morse, each as a short path with real commands and the failure modes you will hit on testnet.

> **INFO: How these differ from the reference cookbooks**
>
> The [CLI](https://docs.morsecms.xyz/cli-workflows.html), [SDK](https://docs.morsecms.xyz/sdk-workflows.html) and [contracts](https://docs.morsecms.xyz/contracts-workflows.html) cookbooks show every operation once. These recipes start from a goal, take ten to twenty minutes end to end, and say what to do when a step fails on testnet.

Every recipe assumes a funded Sui testnet wallet. If you do not have one yet, start with the first recipe, it walks through the faucet.

## Publish

Get content on chain and keep it right.

- [Launch a blog in 10 minutes](https://docs.morsecms.xyz/launch-a-blog.html): Publication, collection and a first post on Sui testnet, nothing else. *(10 min · CLI)*
- [Fix a typo without losing history](https://docs.morsecms.xyz/fix-a-typo.html): Publish a corrected revision and keep every earlier one readable. *(5 min · CLI)*
- [Import an existing Markdown site](https://docs.morsecms.xyz/import-a-site.html): A folder of Markdown posts in, one entry per file, re-runnable. *(15 min · CLI + bash)*

## Collaborate

Other people, other wallets, same publication.

- [Add a co-author](https://docs.morsecms.xyz/co-author.html): Issue a PublisherCap to another wallet, see who can write, revoke. *(10 min · CLI)*
- [Encrypt a post for your team](https://docs.morsecms.xyz/team-only-content.html): Seal-encrypt a post so only cap holders can decrypt it. *(10 min · CLI)*

## Automate

Pipelines and agents as publishers.

- [Publish from CI](https://docs.morsecms.xyz/publish-from-ci.html): Push to main, get a revision on chain, with a key you can revoke. *(20 min · CLI + GitHub Actions)*
- [Let an AI agent publish](https://docs.morsecms.xyz/agent-publishes.html): A wallet, a cap and llms.txt, and an agent publishes unattended. *(15 min · CLI or SDK)*

## Trust

What a reader can check without asking you.

- [Prove a post has not changed](https://docs.morsecms.xyz/verify-a-post.html): Check bytes, revision and author of any post from a clean machine. *(10 min · CLI, no key)*

## Conventions

| You see | It means |
| --- | --- |
| `$ command` | Type it in a shell. The Copy button strips the prompt. |
| `0x69d4...f327` | A shortened id. Yours will differ, never copy these. |
| `--via-aggregator` | Read through the public Walrus aggregator. Reliable on testnet, trusts the operator. |
| `--epochs 14` | How long Walrus keeps the bytes. One epoch is about a day on testnet. |
| Active context | The publication and collection `morse status` shows. Set with `morse use`. |

> **WARNING: Testnet first**
>
> Morse runs on Sui testnet and mainnet, and the contracts are unaudited. These recipes use testnet: it resets, blobs expire, tokens are free and worthless. Treat everything you publish as a rehearsal. Mainnet spends real SUI and WAL, so get a recipe working here first.
