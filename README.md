This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Configure the app before running it. Copy the environment template and add your own local values; never commit `.env` files or credentials.

```bash
cp .env.example .env
```

Then create the schema and seed the default chores plus the parent login:

```bash
npm run db:migrate
npm run db:seed
```

Parent accounts are household-scoped. New households can sign up from `/parent`; if SMTP is configured the app sends a confirmation email, otherwise it returns a development confirmation link.

Use the environment template for the supported database, email, AI, and optional integration settings. Store production secrets in your deployment platform’s secret manager.

Community email notifications use a database-backed outbox. Run the processor once per minute in production so reminders are delivered on schedule:

```cron
* * * * * cd /path/to/ChoresList && /usr/bin/npm run notifications:run
0 * * * * cd /path/to/ChoresList && /usr/bin/npm run price-alerts:run
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

## Pocket Pals

Pocket Pals lives in each player's Games screen. Each Pal has a permanent
`PP-…` serial and a serialized appearance profile (color, pattern, texture,
eyes, and special marking), so their identity, items, progress, and story stay
intact. A primary guardian can keep up to three Pals; parents can move a Pal to
another family member, optionally keep the prior guardian as a co-carer, and
approve or remove other caregivers at Parent → Games → Manage family Pals.
Apply the `20261008120000_add_pocket_pals` and
`20261008153000_pocket_pal_mobility` migrations with `npm run db:deploy`
before running this version. Adoption and care use the existing parent/paired-
device access rules.

Family and private online chess boards use a fixed 8×8 grid so pieces cannot
reflow or split the board after a move. Family chess also supports six friendly
live emotes. Apply `20261008170000_chess_emotes` with `npm run db:deploy` to
enable the persistent emote history.

Public community organizations require verification before discovery and open
joining. A creator whose verified account email matches a claimed custom
organization domain is approved automatically; consumer email domains always
enter the admin review queue at `/parent/community-verification`. Configure
`COMMUNITY_VERIFICATION_ADMIN_EMAILS` as a comma-separated list of reviewer
emails, and apply `20261008180000_community_public_verification` with
`npm run db:deploy`. Private community groups never require verification.

Feed dumplings, bathe, win Treat Memory, Bubble Catch, Rhythm Paws, or Treasure Trail, finish a lesson, and take a full
30-second nap to earn a daily care badge. Needs decay gradually with a gentle
floor while away; the server calculates sleep and daily resets in the household's
time zone. Four dumplings arrive daily. Coins unlock accessories, four rooms,
and room décor such as wall art, plants, furniture, lamps, and shelves. Once a
room is unlocked, a Pal can move between it and the cozy home from the shop.
Bubble Catch plays in the room with bubbles that burst and disappear. Rhythm
Paws uses audible and visual beats to repeat, with age-adjusted timing and quiet
play. All play games share three rewarded wins per day at 8 coins each. Character
action sheets show sleeping, eating, and playing poses. Treasure Trail uses actual
room objects, age-adjusted clues, saved discoveries, and a chest to open after
collecting every key. Every room includes a free plant, storybook, and teddy;
owned décor can add targets. There is no timer or wrong-guess penalty. Moving
rooms clears the old trail. See `docs/pocket-pals-treasure-trail.md` for details.
Care coins are separate from household points. Parents can enable optional
points or ticket rewards under Parent → Games; those rewards are issued once
per completed daily badge. Care remains available afterward. Like other games,
zero daily plays means no additional cap; Pocket Pals always limits badges to
one per day. Age restrictions, enabled settings, and chore gates are checked on
every request.

Run `npm run test:pocket-pals` for the care, sleep, shop, and reward checks.
For isolated browser coverage, start the app on port 3017 and run
`npm run test:pocket-pals:browser` (`POCKET_PALS_TEST_URL` can override the URL).
Browser screenshots are written to `/tmp/pocket-pals-preview` by default.
Original artwork and the generation prompts live in `public/games/pocket-pals/`.

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
