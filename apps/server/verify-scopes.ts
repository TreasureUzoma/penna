import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  const cols = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'newsletter_api_keys'
    ORDER BY ordinal_position
  `);
  console.log("columns:", JSON.stringify(cols.rows, null, 2));

  const journal = await db.execute(sql`
    SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5
  `).catch((e) => ({ rows: [], error: String(e) }));
  console.log("journal:", JSON.stringify(journal.rows ?? journal, null, 2));
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
