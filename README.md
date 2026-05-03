# bannedstory

A MapleStory character dress up tool. Pick items from the closet, see your character wearing them, save the outfit.

Inspired by Bannedstory, built on top of the public [maplestory.io](https://maplestory.io/) API.

## Stack

- Next.js 14 (App Router) + TypeScript
- React 18, Mantine UI, typestyle, SCSS
- Vercel Blob for uploads
- All item data and character renders come from `maplestory.io` (no own backend)
- State persists in `localStorage`

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

You'll need a `.env` file with a Vercel Blob token if you want the upload route to work:

```
BLOB_READ_WRITE_TOKEN=your_token_here

## Disclaimer

This is an unofficial fan project. **Not affiliated with, endorsed by, or sponsored by Nexon.** MapleStory and all related game assets are property of Nexon. This project pulls assets at runtime from the public `maplestory.io` API and ships none of Nexon's copyrighted material in its source.

## License

[MIT](LICENSE)
