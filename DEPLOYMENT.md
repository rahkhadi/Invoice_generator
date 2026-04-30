# Production Deployment

This app is ready to deploy as a website on Vercel or Render.

## Recommended Stack

- Hosting: Vercel
- Database: Neon Postgres, Supabase Postgres, Render Postgres, or Vercel Postgres
- File storage: Cloudflare R2, AWS S3, or any S3-compatible bucket
- Auth: Google OAuth plus platform email/password signup

## GitHub

1. Create a new GitHub repository.
2. Push this project to the repository.
3. Import the repository in Vercel.

## PostgreSQL

Create a hosted Postgres database and set this environment variable in Vercel:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

After the first deploy, run this locally or in Vercel's deployment command if needed:

```bash
npx prisma db push
```

For a production app with users, move to Prisma migrations later:

```bash
npx prisma migrate dev --name init
```

## Google OAuth

In Google Cloud Console, add this production redirect URI:

```text
https://yourdomain.com/api/auth/google/callback
```

Set these Vercel environment variables:

```env
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="https://yourdomain.com/api/auth/google/callback"
```

Keep your local Google client redirect URI too:

```text
http://localhost:3000/api/auth/google/callback
```

## Cloud Storage

Create an S3-compatible bucket and set:

```env
STORAGE_BUCKET="your-bucket"
STORAGE_REGION="auto"
STORAGE_ENDPOINT="https://ACCOUNT_ID.r2.cloudflarestorage.com"
STORAGE_ACCESS_KEY_ID="..."
STORAGE_SECRET_ACCESS_KEY="..."
STORAGE_PUBLIC_BASE_URL="https://your-public-bucket-domain"
```

For AWS S3, omit `STORAGE_ENDPOINT` and use the AWS region, for example:

```env
STORAGE_REGION="us-east-1"
```

## Vercel Build

The build command is:

```bash
npm run build
```

The build script runs `prisma generate` before `next build`.

## Notes

- SQLite is only useful for the early local prototype. Production should use PostgreSQL.
- Serverless file systems are temporary, so production uploads and generated PDFs should use cloud storage.
- Every invoice and PDF endpoint checks the signed-in user before showing or downloading invoices.
