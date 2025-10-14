# Docker Compose Development Setup

## Focus Point 1: The Database Initialization Script

### Why We Need the Script

We need to initialize our PostgreSQL database with:

- Database structure (tables, indexes, constraints)
- Test data for development
- Any custom setup required

PostgreSQL provides a special directory `/docker-entrypoint-initdb.d/` where it automatically runs any `.sql` files when the database is first created.

### The Problem: How Do We Get Our Scripts There?

We have two options:

#### ❌ Option 1: COPY in Dockerfile

```dockerfile
COPY ./scripts/db/init /docker-entrypoint-initdb.d/
```

**Problems:**

- Every time we change a SQL file → rebuild entire image
- SQL files buried inside image → not in version control
- Slow development workflow
- Other developers don't get our script changes

#### ✅ Option 2: Bind Mount in docker-compose

```yaml
volumes:
  - ./scripts/db/init:/docker-entrypoint-initdb.d
```

**Why this is better:**

- Edit SQL file locally → restart container → see changes instantly
- SQL files tracked in git → version controlled
- No rebuilding needed → fast development
- All developers get the same scripts

### The Confusion: Why Two Different Volume Types?

Looking at our docker-compose, we have two volumes that look similar:

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data # Named volume
  - ./scripts/db/init:/docker-entrypoint-initdb.d # Bind mount
```

**They serve completely different purposes:**

- **`postgres_data`** = Stores actual database data (tables, records)
- **`./scripts/db/init`** = Contains initialization scripts we can edit

### Development Workflow

1. **Edit** `scripts/db/init/01-init-database.sql` locally
2. **Restart** container: `docker-compose down && docker-compose up`
3. **PostgreSQL** automatically runs your updated script
4. **No rebuild** needed! 🚀

### The Volume Definitions That Make Them Different

At the bottom of our `docker-compose.dev.yml` file, we have:

```yaml
volumes:
  postgres_data: # Named volume - defined here
    driver: local
  pgadmin_data:
    driver: local
```

**This is why they're different:**

- **`postgres_data:/var/lib/postgresql/data`** = Uses the **named volume** defined above
- **`./scripts/db/init:/docker-entrypoint-initdb.d`** = **Bind mount** (no definition needed)

**Named volume** = Docker manages storage, defined in `volumes:` section
**Bind mount** = Direct mapping to your local directory, no definition needed
