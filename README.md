# Squigs WL Form

Whitelist intake app for Squigs, built as a simple Node web app that can be pushed to GitHub and deployed on Railway.

## What it does

- Presents a styled multi-step Squigs whitelist form over the provided background image
- Stores every submission in SQLite
- Regenerates `submissions.csv` after every submission and every admin review update
- Regenerates `approved-wallets.txt` from all approved submissions
- Provides a password-protected admin dashboard at `/admin.html`

## Local run

1. Set an admin password.
2. Start the server.

```powershell
$env:ADMIN_PASSWORD="replace-this"
node server.js
```

Then open:

- `http://localhost:3000/`
- `http://localhost:3000/admin.html`

## Railway deployment

Recommended setup:

1. Push this project to GitHub.
2. Create a new Railway project from the GitHub repo.
3. Add environment variable `ADMIN_PASSWORD`.
4. Add a Railway volume and mount it to `/data`.
5. Set environment variable `DATA_DIR=/data`.

That keeps:

- `/data/submissions.db`
- `/data/submissions.csv`
- `/data/approved-wallets.txt`

persisted across deploys and restarts.

## Admin workflow

- Open `/admin.html`
- Enter `ADMIN_PASSWORD`
- Review each submission
- Mark each as `pending`, `approved`, or `rejected`
- Copy approved wallets from the dashboard, or open the TXT export directly
- Open the CSV export directly for spreadsheet review

## Notes

- Wallet addresses are unique to prevent duplicate submissions.
- If you prefer Google Sheets later, the current admin export format is already structured cleanly enough to import directly.
