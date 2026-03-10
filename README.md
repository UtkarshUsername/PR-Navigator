# PR Navigator

A static React + TypeScript board for arranging GitHub issues and pull requests on a visual canvas.

## Modes
- `npm run dev` starts the app in `editor` mode from `.env.development`
- `npm run build` builds the app in `viewer` mode from `.env.production`

## Editing workflow
1. Run `npm install`
2. Start the editor with `npm run dev`
3. Add issue and PR cards from GitHub URLs
4. Draw relationships from left to right: the left card is the earlier problem/origin item, and the right card is the later result/solution/follow-up item
5. Export `board.json`
6. Replace `public/board.json` with the exported file
7. Rebuild and publish the static site

## Relationships
- Built-in relationship labels read left to right in plain English: `solved by`, `continued by`, `has option`, `combines into`, `followed by`, and `relates to`
- Common examples: Issue -> PR = `solved by`, PR -> PR = `continued by`, one Issue -> multiple PRs = `has option`, multiple Issues -> one PR = `combines into`
- In the editor, connect cards from the left item to the right item and keep the result/follow-up card physically to the right

## Cards
- Issues and PRs can be marked `By me` in the add-card form or the inspector
- The exported board schema stores that flag as `isOwnedByMe`

## Scripts
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run test`

## Deployment
The app uses `base: './'`, so it works on GitHub Pages project sites as well as root-hosted static deployments.
