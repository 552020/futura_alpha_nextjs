# Business Relationship Setup Scripts

These scripts help you set up business relationships between photographers and clients, enabling the "Send Selection" feature in galleries.

## What is a Business Relationship?

A business relationship connects a photographer (business) with a client, allowing:

- Clients to send selected photos to their photographer
- Photographers to receive client selections via email
- Proper email routing for the gallery selection feature

## Available Scripts

### 1. Interactive Setup (Recommended)

```bash
npm run setup-business-relationship
```

**Features:**

- 🎯 Interactive prompts for photographer and client emails
- ✅ Validates that both users exist in the system
- ⚠️ Warns about existing relationships
- 🔄 Allows creating multiple relationships
- 🛡️ Safe confirmation before creating relationships

**Example:**

```
🏢 Business Relationship Setup
================================
This script will help you set up a business relationship between a photographer and a client.

📸 Enter photographer email: photographer@example.com
👤 Enter client email: client@example.com

🔍 Looking up users...
✅ Found users:
   📸 Photographer: John Doe (photographer@example.com)
   👤 Client: Jane Smith (client@example.com)

Create relationship: client@example.com → photographer@example.com? (y/n): y
🔗 Creating business relationship...

✅ Business relationship created successfully!
```

### 2. CLI Setup (For Automation)

```bash
npm run setup-business-relationship-cli -- -b photographer@example.com -c client@example.com
```

**Options:**

- `-b, --business-email <email>` - Photographer email (required)
- `-c, --client-email <email>` - Client email (required)
- `--clear-existing` - Clear all existing relationships first
- `-v, --verbose` - Show detailed output
- `-h, --help` - Show help message

**Examples:**

```bash
# Basic setup
npm run setup-business-relationship-cli -- -b photographer@example.com -c client@example.com

# With verbose output
npm run setup-business-relationship-cli -- -b photographer@example.com -c client@example.com --verbose

# Clear existing relationships first
npm run setup-business-relationship-cli -- -b photographer@example.com -c client@example.com --clear-existing --verbose
```

## Prerequisites

1. **Both users must exist** in the system (have accounts)
2. **Database connection** must be configured
3. **Users must be registered** with valid email addresses

## How It Works

1. **Script validates** that both photographer and client exist in the database
2. **Creates relationship** in the `business_relationship` table
3. **Enables email routing** for the gallery selection feature
4. **Client can now send** selected photos to their photographer

## Troubleshooting

### "User not found" Error

- Make sure both users have accounts in the system
- Check that email addresses are correct
- Users must be registered before creating relationships

### "Email already exists" Warning

- The client already has a business relationship
- You can create multiple relationships for the same client
- Use `--clear-existing` to remove all existing relationships first

### Database Connection Issues

- Ensure your database is running
- Check your database configuration in `.env`
- Verify database migrations are up to date

## Alternative: Environment Variable

If you don't want to use business relationships, you can set a fallback email:

```bash
# In your .env.local file
NEXT_PUBLIC_PHOTOGRAPHER_EMAIL=photographer@example.com
```

This will be used when no business relationship exists for a client.

## Database Schema

The script works with the `business_relationship` table:

```sql
CREATE TABLE business_relationship (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,  -- Photographer ID
  client_id TEXT,             -- Client ID
  client_name TEXT,           -- Client name
  client_email TEXT,          -- Client email
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Next Steps

After setting up the business relationship:

1. **Test the gallery selection** feature
2. **Verify email delivery** to the photographer
3. **Check the gallery page** for the "Send Photos" button
4. **Monitor logs** for any email delivery issues

The client will now be able to select photos in their gallery and send them to their photographer!
