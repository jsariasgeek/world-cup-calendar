# Update World Cup Match Data

Fetch the latest World Cup 2026 knockout stage results from Wikipedia and update `data/world-cup-2026.js` with confirmed teams and scores.

## Steps

1. **Fetch current data** from Wikipedia:
   - Fetch `https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage`
   - Ask for: all knockout matches with match numbers, team names (real names where confirmed, placeholder where TBD), and whether the match result is final.
   - Also fetch `https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_group_stage` for any group stage results needed to resolve "Winner Group X" / "Runner-up Group X" placeholders.

2. **Read the current data file**: `data/world-cup-2026.js`

3. **For each knockout match** (matches 73 and above), compare the Wikipedia data to the current file entry and apply these updates where applicable:

   - If **both teams are now known**: set `teamA` and `teamB` to the real country names, set `teamsConfirmed: true`.
   - If **only one team is known**: replace that team's placeholder (`"Winner Group X"` / `"Runner-up Group X"`) with the real country name; leave the other placeholder and keep `teamsConfirmed: false`.
   - If **the 3rd-place group pool has been narrowed** (e.g. `"Best 3rd-Placed Team (Groups A/B/C/D/F)"` → `"Best 3rd-Placed Team (Groups C/D/F)"`): update the string to reflect the current narrowed pool.
   - Only set `teamsConfirmed: true` when **both** `teamA` and `teamB` are real country names — never when either is still a placeholder.

4. **Do not touch** group stage matches (matches 1–72) or any field other than `teamA`, `teamB`, and `teamsConfirmed`.

5. After editing, print a summary table of what changed: match number, old values, new values.
