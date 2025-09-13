# Why a Separate Queries File?

## Purpose

The `queries.ts` file contains complex SQL queries that are:

1. **Reusable** - Can be used by multiple API endpoints
2. **Complex** - Raw SQL with UNIONs, JSON aggregation, and JOINs
3. **Performance-critical** - Optimized single-query approach
4. **Type-safe** - Proper TypeScript interfaces for the results

## Alternative Approaches

We could:

1. **Inline in route.ts** - Put the SQL directly in the API handler
2. **Database functions** - Create PostgreSQL functions
3. **Drizzle query builder** - Use Drizzle's query builder (but complex UNIONs are harder)

## Current Decision

Using a separate file because:

- The optimized query is complex and deserves its own space
- It might be reused by other endpoints (gallery API, dashboard API)
- Easier to test and maintain complex SQL
- Clear separation of concerns

## Future Considerations

If this becomes the only place using this query, we could inline it back into `route.ts` for simplicity.
