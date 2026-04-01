# PR Navigator

A static React + TypeScript board for arranging GitHub issues and pull requests on a visual canvas.

<img width="1896" height="1056" alt="image" src="https://github.com/user-attachments/assets/908db710-229c-43f5-b673-bc1f672c59f7" />

## Modes
- `npm run dev` starts the app in `editor` mode from `.env.development`
- `npm run build` builds the app in `viewer` mode from `.env.production`
- In the viewer build, `/` redirects to `/t3code-utkarsh`
- The archived board lives at `/archived` in editor mode and `/t3code-utkarsh/archived` in viewer mode

## Editing workflow
1. Run `npm install`
2. Start the editor with `npm run dev`
3. Use the sidebar to pull your authored issues and PRs for the selected repo
4. Add cards from the authored-items sidebar or from the manual issue/PR dialog
5. Draw relationships from left to right: the left card is the earlier problem/origin item, and the right card is the later result/solution/follow-up item
6. Use `View archived` to switch boards and `Send ... to archived/current` to move selected cards between them
7. Replace `public/board.json` with the exported file
8. Rebuild and publish the static site

## Relationships
- Built-in relationship labels read left to right in plain English: `solved by`, `continued by`, `has option`, `combines into`, `followed by`, and `relates to`
- Common examples: Issue -> PR = `solved by`, PR -> PR = `continued by`, one Issue -> multiple PRs = `has option`, multiple Issues -> one PR = `combines into`
- In the editor, connect cards from the left item to the right item and keep the result/follow-up card physically to the right

## Cards
- Issues and PRs can be marked `By me` in the add-card form or the inspector
- The editor sidebar fetches issues and PRs authored by the configured GitHub username and adds them directly to the board
- The exported board schema stores that flag as `isOwnedByMe`
- The board schema now stores an `archived` collection alongside the current board

## GitHub sidebar
- `VITE_GITHUB_USERNAME` sets the default GitHub username used by the editor sidebar
- `VITE_GITHUB_TOKEN` is optional and only helps with GitHub API rate limits

## Scripts
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run test`

## Deployment
The app uses `base: './'`, so it works on GitHub Pages project sites as well as root-hosted static deployments.
Cloudflare Pages picks up `public/_redirects`, which keeps the viewer canonically on `/t3code-utkarsh`.
