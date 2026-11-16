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
