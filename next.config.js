/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages serves static files, so the build has to emit them.
  //
  // NEXT_NO_EXPORT is for local verification builds. Exporting copies all of
  // public/, and public/avatar is a junction onto 53k extracted files, so a
  // local export writes 2 GB. Cloudflare never sees that: the junction is
  // gitignored, so their clone has no public/avatar at all
  output: process.env.NEXT_NO_EXPORT ? undefined : 'export',

  // for verification builds that dont knock down dev local server
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

module.exports = nextConfig;
