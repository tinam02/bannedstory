# Henehoe

A MapleStory character dress up tool. Pick items from the closet, see your
character wearing them, pose them, put them on a map, save the picture.

Live at [henehoe.app](https://henehoe.app).

## What it does

- Every equippable item, searchable, with the cash shop releases included
- Layered rendering
- Poses, expressions, skin tones, ear variants, item effects
- Several characters on one stage, each dragged where you want
- Speech balloons and name tags, drawn from the game's own UI art
- Export as PNG or animated GIF, import an outfit back from JSON

## Stack

- Next.js 14 (App Router) with `output: 'export'`, so the build is static files
- TS | React 18
- Mantine | typestyle | SCSS
- No db Outfits live in `localStorage`

Content extracted with [WzComparerR2](https://github.com/Kagamia/WzComparerR2)

`scripts/wz/*.lua` for extraction
`.mjs` scripts build the indexes, the icons and the
webp conversions


## Run locally

```bash
npm install
npm run dev
```

The closet will be empty without the extracted art, which is not in this repo and is a few GB
`public/avatar` is expected to be a junction onto the extraction output
`NEXT_PUBLIC_ASSET_BASE` points the app at a different host if you have one

### Scripts

| command | what it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | static export |
| `npm run maps` | rebuild `public/maps/index.json` after adding a map |
| `npm run webp` | convert plates and layer sprites to webp |
| `npm run webp -- --prune-still` | drop sprites the renderer never requests |
| `node scripts/deploy.mjs --dry` | say what a deploy would send |
| `node scripts/deploy.mjs` | build and ship the site |
| `node scripts/deploy.mjs --assets` | the site, + any assets the box is missing |
| `node scripts/deploy.mjs --clean` | the site, after emptying the web root |

Deploying needs `DEPLOY_HOST` and `DEPLOY_PATH` in `.env.local`

A deploy unpacks a tar over what is already there, so a file deleted here goes
on being served off the box. `--clean` wipes the web root first, keeping only
`avatar/`, which is far too big to resend. It costs a second or two of 404s, so
it is worth running after deleting a map or pruning sprites rather than every
time. Deleted items under `avatar/` are never removed either, deliberately,
since they are served `immutable` for a year

## Disclaimer

This is an unofficial, non-commercial fan project. **Not affiliated with,
endorsed by, or sponsored by Nexon.** MapleStory and all related art, names and
assets are © NEXON Korea Corp.

The bulk of the extracted art, the character sheets, is not in this repo at all
