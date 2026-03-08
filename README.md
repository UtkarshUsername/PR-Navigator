# PR Navigator

A static React + TypeScript board for arranging GitHub issues and pull requests on a visual canvas.

## Modes
- `npm run dev` starts the app in `editor` mode from `.env.development`
- `npm run build` builds the app in `viewer` mode from `.env.production`

## Editing workflow
1. Run `npm install`
2. Start the editor with `npm run dev`
3. Add issue and PR cards from GitHub URLs
4. Draw relationships between cards
5. Export `board.json`
6. Replace `public/board.json` with the exported file
7. Rebuild and publish the static site

## Scripts
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run test`

## Deployment
The app uses `base: './'`, so it works on GitHub Pages project sites as well as root-hosted static deployments.
