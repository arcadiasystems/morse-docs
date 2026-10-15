> Source: https://docs.morsecms.xyz/import-a-site.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# Import an existing Markdown site

> Bring an existing Hugo, Astro or plain Markdown site into Morse. One entry per post, a map file so you can run it twice, and a way to push edits as revisions.

- About 15 minutes
- CLI + bash + jq
- A folder of .md files
- Testnet

## What this does

You have a folder of Markdown posts from Hugo, Astro, Jekyll, Obsidian or a plain repo. This recipe publishes each file as one Morse entry, writes a small map from filename to entry id, and lets you run it again later without duplicating anything. Morse stores bytes as they are, so front matter goes in untouched and your existing renderer keeps working.

## Lay out the folder

```text
content/
  posts/
    2026-09-01-why-a-protocol.md
    2026-09-14-dual-head-revisions.md
    2026-10-02-publishing-from-an-agent.md
morse-map.json        <- created by the script
```

Make sure your active context is the publication and collection you want to fill:

```bash
$ morse use my-blog-1760000000 posts
$ morse status
```

## Dry run

Count the files and estimate storage before spending WAL. Walrus charges per blob per epoch, so the total size and the epoch count are what matter.

```bash
$ ls content/posts/*.md | wc -l
$ du -ch content/posts/*.md | tail -1
```

## Publish everything

The script publishes every file that is not yet in the map. The entry name is the filename without the extension. `--json` gives machine-readable output, `-q` hides the progress lines, and `jq` pulls the entry id out.

```bash
#!/usr/bin/env bash
set -euo pipefail
MAP=morse-map.json
EPOCHS=${EPOCHS:-30}
[ -f "$MAP" ] || echo '{}' > "$MAP"

for f in content/posts/*.md; do
  name=$(basename "$f" .md)
  if jq -e --arg n "$name" '.[$n]' "$MAP" >/dev/null; then
    echo "skip  $name (already published)"; continue
  fi
  echo "add   $name"
  out=$(morse --json -q entry add "$name" --file "$f" --epochs "$EPOCHS")
  id=$(echo "$out" | jq -r '.entryId')
  tmp=$(mktemp)
  jq --arg n "$name" --arg id "$id" '.[$n] = {entryId: ($id|tonumber), file: $n}' "$MAP" > "$tmp" && mv "$tmp" "$MAP"
done
echo "done, $(jq length "$MAP") entries in $MAP"
```

```bash
$ chmod +x import.sh
$ EPOCHS=30 ./import.sh
```

> **INFO: One transaction pair per post**
>
> Each `entry add` signs two transactions. Thirty posts is sixty signatures and about a minute on testnet. If a run stops halfway, run it again, the map makes it pick up where it left off.

## Keep the map

Commit `morse-map.json` next to your content. It is the only thing that ties a filename to an entry id, and your site generator or reader app needs it to fetch bodies from Walrus.

```json
{
  "2026-09-01-why-a-protocol": { "entryId": 0, "file": "2026-09-01-why-a-protocol" },
  "2026-09-14-dual-head-revisions": { "entryId": 1, "file": "2026-09-14-dual-head-revisions" }
}
```

## Re-running safely

New files get added, existing ones are skipped. To push an edited post as a new revision rather than a new entry, look the id up in the map and use `revision publish-direct`:

```bash
$ id=$(jq -r '.["2026-09-14-dual-head-revisions"].entryId' morse-map.json)
$ morse revision publish-direct "$id" --file content/posts/2026-09-14-dual-head-revisions.md --epochs 30
```

A simple way to automate that: store each file's content hash in the map and publish a revision whenever the hash changes. Left as a ten-line exercise, or ask your agent, see [Let an AI agent publish](https://docs.morsecms.xyz/agent-publishes.html).

## Pitfalls

| Pitfall | What happens | What to do |
| --- | --- | --- |
| Entry names are not unique on chain | Running without the map creates duplicates | Always keep and commit the map |
| Images and other assets | A Markdown file only carries text | Publish each asset as its own entry, or keep assets on a plain host for now |
| Big files | Walrus storage cost scales with size and epochs | Keep posts as Markdown, strip embedded base64 |
| Testnet reset | Entries and blobs are gone, the map is stale | Delete the map and re-run |

## Next

- [Publish from CI](https://docs.morsecms.xyz/publish-from-ci.html): Run this script on every push to main.
- [Fix a typo without losing history](https://docs.morsecms.xyz/fix-a-typo.html): How revisions work.
- [SDK reference cookbooks](https://docs.morsecms.xyz/sdk-workflows.html): The same loop in TypeScript with addEntryFromBytes.
