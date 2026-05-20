---
title: Database Migration Control using Prisma and SQL
impact: CRITICAL
impactDescription: Eliminates accidental data loss and ensures 100% control over database changes.
tags: database, prisma, postgresql, migration, security
---

## Database Migration Control using Prisma and SQL

**Impact: CRITICAL (Prevents data loss and execution errors)**

Direct database updates via Prisma using raw commands can bypass review gates, leading to accidental column drops, table locks, or unmonitored schema mutations. Always generate the migration file as raw SQL, review it, and then apply it.

**Incorrect (Applying mutations directly without SQL inspection):**

```bash
# BAD: Direct push that mutates database immediately without SQL verification
npx prisma db push

# BAD: Auto-applying migrations without verifying the exact SQL statements
npx prisma migrate dev --name change_field_casing
```

**Correct (Generating SQL migration first, reviewing it, then applying):**

1. Generate the SQL migration without applying it:
```bash
npx prisma migrate dev --create-only --name change_field_casing
```

2. Review the generated `migration.sql` inside `prisma/migrations/<timestamp>_change_field_casing/migration.sql`. Ensure all `@map` and `@@map` transformations are correct and no columns are dropped unexpectedly:
```sql
-- ALTER TABLE "user" RENAME COLUMN "emailVerified" TO "email_verified";
```

3. Safely apply the migration once confirmed:
```bash
npx prisma migrate dev
```

Reference: [Prisma Migrations Documentation](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/overview)
