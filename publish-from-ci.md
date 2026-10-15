> Source: https://docs.morsecms.xyz/publish-from-ci.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Publish from CI

> Push to main, get a revision on chain. A separate pipeline key you can revoke, the environment variables the CLI reads, and a workflow file to copy.

- About 20 minutes
- CLI + GitHub Actions
- A repo of posts
- Testnet

## The idea

Your posts live in a git repo. On every push to `main`, CI publishes new files as entries and changed files as revisions. No deploy step, no server to keep up: the published state is on Sui and Walrus, the source of truth is the repo, and the map file links the two.

## A CI-only publisher key

Do not put your owner key in CI. Make a separate wallet for the pipeline, fund it with a little SUI and WAL, and issue it a `PublisherCap` from your owner wallet. If CI ever leaks the key, you revoke one cap and move on.

```bash
$ morse cap issue 0xCI_WALLET_ADDRESS
$ morse --json publication get | jq -r .id      # you will need this id
```

## Environment variables the CLI reads

In a non-interactive shell the CLI takes everything from the environment. Flags beat variables, variables beat the config file.

| Variable | Set it to | Why |
| --- | --- | --- |
| `MORSE_PRIVATE_KEY` | The CI wallet's `suiprivkey1...` | Highest-priority key source, never written to disk |
| `MORSE_NETWORK` | `testnet` | No profile needed |
| `MORSE_PUBLICATION` | The publication object id | Active publication without `morse use` |
| `MORSE_COLLECTION` | `posts` | Active collection |

With those four set, `morse status` in CI shows the same context you have locally, with no keystore and no prompts.

## GitHub Actions workflow

This reuses `import.sh` from [Import an existing Markdown site](https://docs.morsecms.xyz/import-a-site.html) and commits the updated map back to the repo so the next run knows what exists.

```yaml
name: Publish to Morse
on:
  push:
    branches: [main]
    paths: ["content/posts/**", "morse-map.json"]

permissions:
  contents: write

jobs:
  publish:
    runs-on: ubuntu-latest
    env:
      MORSE_PRIVATE_KEY: ${{ secrets.MORSE_CI_PRIVATE_KEY }}
      MORSE_NETWORK: testnet
      MORSE_PUBLICATION: ${{ vars.MORSE_PUBLICATION_ID }}
      MORSE_COLLECTION: posts
      EPOCHS: "30"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm i -g @arcadiasystems/morse-cli
      - run: morse --yes -q status
      - run: ./import.sh
      - name: Commit the map
        run: |
          git config user.name "morse-ci"
          git config user.email "ci@users.noreply.github.com"
          git add morse-map.json
          git diff --cached --quiet || git commit -m "chore: update morse map" && git push
```

Store the key as a repository **secret** and the publication id as a repository **variable**. The `paths` filter keeps the job from running on unrelated commits.

## Idempotency and exit codes

The map is what makes a rerun safe: a file already in it is skipped. Everything else you need for scripting is in the CLI's exit codes and `--json`.

| Exit code | Meaning | In a pipeline |
| --- | --- | --- |
| 0 | Success | Carry on |
| 1 | Any other failure | For example a contract abort such as `ESlugAlreadyExists`; read the message and fail the job |
| 2 | Usage error | Your command line is wrong, fix the script |
| 3 | Not found | Wrong publication id or entry id |
| 4 | Auth or permission | Cap revoked, wrong key, or no cap for this publication |
| 5 | Network or transport | Retry once after a pause, then fail the job |

```bash
publish() { morse --json -q entry add "$@"; }
out=$(publish "$name" --file "$f" --epochs "$EPOCHS") || { [ $? -eq 5 ] && sleep 20 && out=$(publish "$name" --file "$f" --epochs "$EPOCHS"); }
```

> **INFO: --yes and -q**
>
> `--yes` answers every confirmation, which matters for `delete` commands. `-q` keeps progress bars out of your logs so the JSON on stdout is the only thing the script sees.

## Lock it down

| Risk | Mitigation |
| --- | --- |
| Key leaks from CI | It is a publisher key, not the owner. `morse cap revoke` and rotate. |
| Someone pushes garbage to main | Branch protection, and the chain keeps every revision so nothing is lost |
| Pipeline publishes twice | The map, committed back after every run |
| WAL runs out | Check the CI wallet balance in the job and fail early with a clear message |

## Next

- [Import an existing Markdown site](https://docs.morsecms.xyz/import-a-site.html): The script this workflow runs.
- [Let an AI agent publish](https://docs.morsecms.xyz/agent-publishes.html): Same key model, different author.
- [CLI overview](https://docs.morsecms.xyz/cli-overview.html): All environment variables and exit codes.
