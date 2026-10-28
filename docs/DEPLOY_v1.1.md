# Deploying SmartOps v1.1 (Review 2 features)

Branch: `feat/review2-features`. Deploy the **backend first**, then share the new APK.
The old v1.0 APK keeps working against the new backend (the new tables are only
sent to apps that ask for them), so friends can upgrade whenever they like.

## 1. Push the branch (from your PC)

```bash
git push -u origin feat/review2-features
```

Merge it into `main` on GitHub (or locally) when you're happy with it.

## 2. On the server

```bash
ssh -i "C:\Users\Shubhan\OneDrive\Desktop\safe\smartops-key.pem" ubuntu@54.198.212.197
```

Then, on the server:

```bash
# a) Back up the live database first (keep this file until v1.1 has run fine for a while)
pg_dump -U smartops -h localhost smartops_db > ~/backup-before-v1.1-$(date +%F).sql

# b) Get the new code (adjust the folder if your checkout lives elsewhere)
cd ~/capstone && git fetch && git checkout feat/review2-features && git pull

# c) Install dependencies and run the migrations (additive + safe to re-run)
cd backend && npm ci --omit=dev && npm run migrate

# d) Add the Gemini settings to backend/.env (the key stays on the server only)
nano .env
#   GEMINI_API_KEY=<your key>
#   GEMINI_MODEL=gemini-3.5-flash-lite
#   VOICE_DAILY_LIMIT=50

# e) Restart and check
pm2 restart smartops-api --update-env
curl https://smartops-app.duckdns.org/api/health
```

If anything goes wrong: `git checkout main && pm2 restart smartops-api`. The
migrations only add columns/tables, so the old code still runs on the new schema.
To fully roll back data: `psql -U smartops -h localhost smartops_db < ~/backup-before-v1.1-<date>.sql`.

## 3. Share the APK

`docs/SmartOps-v1.1.0.apk` installs **over** v1.0 (same signing key, versionCode 2),
so existing users keep everything on their phone. Send it over WhatsApp or Drive.

## What to try (test checklist for friends)

| Feature | Where | Try |
|---|---|---|
| Shop details & UPI | Profile → Shop details & UPI | Add your UPI ID and address |
| Optional batch/expiry | Stock In | Kirana: save loose rice without batch/expiry. Pharmacy: still required |
| Suppliers | Profile → Suppliers, or "+ New supplier" on Stock In | Add a supplier, pick them on Stock In |
| Purchase order | Smart Restock → "Order these from a supplier" | Edit quantities, send on WhatsApp |
| Bill sharing | After a sale, or Records → open an order | "Share PDF bill" and "WhatsApp bill" |
| Khata reminder | Khata → open a customer | "Send reminder on WhatsApp" (includes UPI pay link) |
| Staff | Profile → Staff accounts | Add a helper, log in on a second phone, sell, check it syncs both ways |
| Voice | Mic button on Home | Hold and say "Ramesh ko do sau rupaye udhaar" |

## Running the API tests

Needs any throwaway Postgres database whose name contains "test":

```bash
cd backend
TEST_DATABASE_URL=postgresql://postgres@localhost:5433/smartops_test npm test
```
