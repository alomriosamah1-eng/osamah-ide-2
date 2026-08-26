# Profile & Launch Adapters

How `/ship` stays reusable across an app, a webpage, a CLI: the **Project Profile** (from `scripts/detect.py`) carries everything project-specific; the adapters below turn a profile into concrete git + launch + DB actions.

---

## Git & worktree scaffold (universal — every lane)

```
1. ensure a repo            → if no .git: `git init` + initial commit (greenfield builds)
2. slug the work            → ship/<kebab-of-idea-or-fix>   (e.g. ship/csv-export-button)
3. Fast lane                → create/switch the branch in place, work on the diff
4. Full lane                → build in an ISOLATED WORKTREE:
                              `git worktree add ../.ship-worktrees/<slug> -b ship/<slug>`
                              (or Agent isolation:"worktree") — never touches the live tree
5. journal everything       → .ship/<run>/  (state) + SHIP.md (report) at repo root
6. cleanup                  → after launch or discard: `git worktree remove`
```

Rule: **never commit to `main` directly, never build in the user's working copy.** A wrong build is a deleted branch + removed worktree.

---

## Launch adapters (resolved from `profile.launch_adapter`)

### `vercel` — web app/site (hcc-quote, texas-ledge-pro)
Push = production, so the gate IS the merge.
```
1. push ship/<slug>                     → Vercel builds a PREVIEW deploy automatically
2. capture the preview URL              (gh pr create, or vercel CLI output)
3. PRESENT summary + preview link → wait for the human tap
4. on approve: merge ship/<slug> → main → Vercel deploys prod
5. smoke test prod (curl the key route / load the page) 
6. on smoke FAIL → auto-rollback: `vercel rollback` (or revert the merge + push) → notify
```
Never `git push origin main` directly. Never skip the preview.

### `fastlane` — native mobile (hercules)
```
1. merge ship/<slug> → main  (after gate)
2. tag: `git tag v<next>-android && git push --tags`  → GitHub Actions → fastlane
3. fastlane lane ladder: internal → beta → production (staged 10% rollout)
4. PRESENT the lane + version; the human taps to promote internal→beta→prod
5. rollback = halt the staged rollout in Play Console (mark [USER MUST RUN])
```
Respect the existing `android/fastlane/Fastfile` lanes; don't reinvent them.

### `eas` — Expo
```
eas build --profile production  → eas submit   (gate before submit; submit is the launch)
```

### `static-pr` / unknown — no pipeline detected
```
open a PR with the SHIP.md summary as the body; hand to the human. "Launch" = the PR.
If type/launch is unknown: ask ONCE, then persist the answer to CLAUDE.md so it's silent next time.
```

---

## Database adapter (resolved from `profile.db_adapter`)

### `supabase`
A schema change never touches prod until the gate.
```
1. detect need               → migration only if the change alters schema (new table/column/policy)
2. create isolated DB        → Supabase MCP create_branch  (preview branch DB)
3. write + apply             → generate migration SQL → apply_migration on the BRANCH
4. test against the branch   → run profile.test pointed at the branch DB
5. prod migration            → runs INSIDE Launch, after the human tap, before/with the merge
6. escalate                  → if a migration is destructive (drop/rename with data) → escalation class
```

### `prisma` / `drizzle`
Generate the migration file, apply to a local/preview DB, never `migrate deploy` to prod outside the gate.

### `none`
No migration station. (hcc-quote is local-first — quotes are file folders, no DB.)

---

## Escalation & secrets
New env var or secret the build needs but can't find (`process.env.X` with no value anywhere) → **stop, escalate** (principle 1). Never invent a credential, never commit a placeholder secret, never `.env` a real key into git.
