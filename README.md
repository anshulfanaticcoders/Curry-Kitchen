# Curry Kitchen

Dynamic Next.js mock-to-app build for Curry Kitchen meal package ordering, guest checkout, customer dashboard, and admin operations.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to a local MySQL database, for example:

```bash
DATABASE_URL="mysql://root:@localhost:3306/currykitchen_next"
```

3. Push the Prisma schema and seed fake data:

```bash
npm run db:push
npm run db:seed
```

4. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seeded Accounts

Use these only for local testing:

- Admin: `admin@currykitchen.test` / `Password123!`
- Customer: `customer@currykitchen.test` / `Password123!`
- Student: `student@currykitchen.test` / `Password123!`

## Useful Commands

```bash
npm run lint
npm run build
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Notes

- Prisma 7 uses `prisma.config.ts` for `DATABASE_URL` and `@prisma/adapter-mariadb` as the MySQL-family adapter.
- Stripe checkout is test-mode ready. If `STRIPE_SECRET_KEY` is missing locally, checkout creates a mock paid order so CRUD and dashboards can still be tested.
- Student packages are paid first, then stay pending until admin approval.
