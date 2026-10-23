# Go-live gates

These stay open until a person completes them. The app is not ready for people outside a private test until every box is ticked.

| Gate | Status | Notes |
| --- | --- | --- |
| Qualified review of exercises, demonstrations, warm-ups, and cooldowns | Open | Fill `exercises.csv`, `warmups.csv`, and `cooldowns.csv`. See [README.md](README.md). |
| Qualified review of foods and meals | Open | Fill `nutrition.csv`. |
| Privacy notice published | Done in code | `/privacy` is public. Confirm the hosted URL after Render is live. |
| Replace the local test admin | Open | Change the password on Account, or delete `admin@homeworkout.local` / `e2e-admin@example.com` and run `npm run admin:create` with a real email. |
| Hosted staging verified over HTTPS | Open | Needs a Render account. Then run the smoke checks and Playwright in [DEPLOY.md](../DEPLOY.md). |
| Daily backups and a test restore | Open | Confirm in the Render Postgres dashboard. |
