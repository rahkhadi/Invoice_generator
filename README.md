# Construction Invoice Generator

A full-stack invoice generator for construction work orders. I built this app to upload work order PDFs, extract the job details, review/edit the invoice, save invoice history, and export professional PDF invoices.

## Features

- Contractor signup and login
- Google sign-in support
- Saved contractor company profile
- Auto-filled company name, GST/HST number, and address on new invoices
- Work order PDF upload
- Text extraction with `pdf-parse`
- OCR fallback with Tesseract for scanned or image-heavy PDFs
- Line-item parsing for construction work orders
- Editable invoice review screen
- Manual invoice creation for quotes or new customers
- Invoice statuses: draft, sent, paid
- Searchable invoice history
- Protected invoice PDF viewing and download
- User-specific invoice access, so each contractor only sees their own invoices
- PostgreSQL database with Prisma ORM
- S3-compatible cloud storage support for uploaded and generated PDFs

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- `pdf-parse`
- Tesseract OCR
- `pdf-lib`
- S3-compatible storage, such as Cloudflare R2 or AWS S3
- Google OAuth

## Main Pages

- `/login` - contractor login
- `/signup` - platform account signup
- `/profile` - saved company profile
- `/dashboard` - invoice summary
- `/upload` - upload work order or create invoice manually
- `/invoices` - invoice history with PDF view/download
- `/invoices/new` - manual invoice editor
- `/invoices/[id]` - review/edit saved invoice

## Environment Variables

Create a `.env` file for local development:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

STORAGE_BUCKET="your-bucket"
STORAGE_REGION="auto"
STORAGE_ENDPOINT="https://ACCOUNT_ID.r2.cloudflarestorage.com"
STORAGE_ACCESS_KEY_ID="your-access-key"
STORAGE_SECRET_ACCESS_KEY="your-secret-key"
STORAGE_PUBLIC_BASE_URL="https://your-public-bucket-domain"
```

For local testing, storage variables are optional. If they are missing, the app stores files in `public/uploads` and `public/exports`.

## Local Development

Install dependencies:

```bash
npm install
```

Generate Prisma Client:

```bash
npx prisma generate
```

Push the database schema:

```bash
npx prisma db push
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Deployment

The app is ready to deploy on Vercel or Render.

Recommended production setup:

- Hosting: Vercel
- Database: Neon PostgreSQL or Supabase PostgreSQL
- File storage: Cloudflare R2 or AWS S3
- Auth: Google OAuth plus platform signup/login

Production Google OAuth redirect URI:

```text
https://yourdomain.com/api/auth/google/callback
```

More deployment notes are in `DEPLOYMENT.md`.

## Testing

Run tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

## Notes

- Every uploaded PDF is parsed dynamically.
- No sample work orders are hardcoded.
- OCR is used only when text extraction is poor or the header needs image/logo text.
- Raw extracted text is stored with invoices for debugging.
- Invoice PDF routes are protected so users can only access their own invoice PDFs.
