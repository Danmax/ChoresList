This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Configure MySQL before running the app:

```bash
DATABASE_URL="mysql://u130206374_parent:PASSWORD@srv2104.hstgr.io:3306/u130206374_chores"
PARENT_EMAIL="parent@example.com"
PARENT_PASSWORD="ChangeMe123!"
AUTH_SECRET="replace-with-a-long-random-string"
PUBLIC_BASE_URL="https://chores.example.com"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="chores@frowear.com"
SMTP_PASSWORD="your-gmail-app-password"
SMTP_FROM="ChoresList <chores@frowear.com>"
GIPHY_API_KEY=""
```

Then create the schema and seed the default chores plus the parent login:

```bash
npm run db:migrate
npm run db:seed
```

Parent accounts are household-scoped. New households can sign up from `/parent`; if SMTP is configured the app sends a confirmation email, otherwise it returns a development confirmation link.

For Gmail SMTP, `SMTP_PASSWORD` must be a Google app password for `chores@frowear.com`, not the normal Gmail password. In the Google account, enable 2-Step Verification, then create an app password for Mail and paste that 16-character password into `.env` and the production host environment variables.

Community email notifications use a database-backed outbox. Run the processor once per minute in production so reminders are delivered on schedule:

```cron
* * * * * cd /path/to/ChoresList && /usr/bin/npm run notifications:run
```

The processor sends one-time event reminders at 8:00 AM in the event time zone 10 days before, 3 days before, and on the event date. It also sends item assignments, RSVP/registration confirmations, and Monday manager summaries. `PUBLIC_BASE_URL` and SMTP settings are required for delivery.

## Feature plugins

Household owners can activate or deactivate optional features under Parent Settings. Deactivation hides navigation, blocks protected pages and APIs, and stops plugin-owned scheduled work while preserving existing data. Grocery & Pantry, Community Events, Reports & Coaching, Family Calendar, Calendar Sync, and Notifications default to active to preserve existing household behavior.

Emotional Wellbeing is opt-in and stores private qualitative check-ins. Check-ins do not affect points, badges, reports, or leaderboards, and access follows household child-access rules.

After pulling schema changes, apply migrations before starting the app:

```bash
npm run db:deploy
```

`GIPHY_API_KEY` is optional and enables GIF search on event message boards. Members can still paste an HTTPS GIF URL when it is not configured.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
