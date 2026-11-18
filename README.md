# Blog: https://hieutrungle.github.io/blog/

Research, study notes, and knowledge sharing by Hieu T. Le. Built by GitHub Pages (Jekyll) from Markdown; no local tools needed.

## Add a new piece
1. Copy `TEMPLATE.md` to `_posts/YYYY-MM-DD-short-name.md` (the date and name form the address, e.g. `/blog/2026/12/short-name/`).
2. Fill in the front matter (title, kind, date, summary) and write in Markdown.
3. Commit and push to `main` (or use "Add file" on github.com). The site rebuilds in about a minute; the post appears on the home page and in the RSS feed.

Addresses are permanent: do not rename a published file. To fix a post, edit it and add `updated: YYYY-MM-DD` to its front matter.
A post can pin its own address with `permalink:` (the dissertation uses `/dissertation/`).

## Dissertation
`_posts/2026-11-15-dissertation.md` → https://hieutrungle.github.io/blog/dissertation/. Add the approved PDF as `assets/dissertation/Le_dissertation.pdf` and turn the "Full text" button into a link.

## Agentic Systems roadmap

`_data/series/agentic-systems.yml` mirrors the [canonical course index](https://github.com/hieutrungle/agentic-systems-notes/blob/main/docs/curriculum/index.qmd). When the owner approves a title or route change, publish the Quarto site and then update the mirror in the same order as the index. The roadmap workflow checks the mirror against the course source and verifies the published destinations.

From this repository with Agentic Systems Notes checked out next to it, run the same check locally.

```bash
python3 ../agentic-systems-notes/tests/check_curriculum.py \
  --blog-roadmap _data/series/agentic-systems.yml \
  --live-site https://hieutrungle.github.io/agentic-systems-notes/
```
