// Next declares `*.module.scss` and `*.module.css` in next/types/global.d.ts,
// but nothing for a plain stylesheet imported for its side effects. So
// `import './globals.scss'` in app/layout.tsx has no declaration to match, and
// a newer typescript than the 5.3.3 in package.json reports TS2882 for it.
//
// The wildcards below are less specific than Next's `*.module.scss`, and
// typescript prefers the longest matching pattern, so css modules still get
// their typed default export rather than this
declare module '*.scss';
declare module '*.css';
