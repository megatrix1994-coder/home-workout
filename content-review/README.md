# Content review sheets

These sheets list every piece of training and nutrition content the app shows, so a qualified person can check it before real users rely on it.

| Sheet | Contents | Suggested reviewer |
| --- | --- | --- |
| `exercises.csv` | Exercise instructions, muscles, difficulty, goal, equipment, and the demonstration clip | Certified trainer or physiotherapist |
| `warmups.csv` | Warm-up stretches and their holds | Certified trainer or physiotherapist |
| `cooldowns.csv` | Cooldown stretches, holds, and the demonstration clip | Certified trainer or physiotherapist |
| `nutrition.csv` | Foods, allergens, diet tags, nutrient values with sources, meals, and the general-guidance notice | Registered dietitian or nutritionist |

## How to review

1. Open a sheet in Excel or Google Sheets.
2. For each row, read the text and, where a demonstration path is given, play that clip from `client/public/demonstrations`.
3. Fill in the last four columns:
   - **Verdict**: `approve`, or `change`.
   - **Notes**: for a change, say what is wrong and what it should say instead.
   - **Reviewer name**: with your qualification.
   - **Date**: the date of the review.
4. Send the filled-in sheets back to the admin.

Many exercise rows follow the same pattern for a muscle at different difficulty levels. Reviewing one row of a pattern carefully and then checking the rest for the same wording is fine. Note that you did so.

## For the admin

- Regenerate the sheets after any content change with `npm run content:sheet`. It overwrites the four files, so keep filled-in copies under another name.
- Apply the requested changes in `server/src`, run `npm test`, then run `npm run db:seed`.
- The automated checks in `server/src/content.test.ts` cover structure and obvious gaps only. They are not a substitute for this review.
