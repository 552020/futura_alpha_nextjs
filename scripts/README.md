# Scripts Directory

This directory contains utility scripts organized by function for the Futura Alpha ICP project.

## Directory Structure

```
scripts/
├── blob/               # Storage management scripts
│   ├── vercel_blob/    # Vercel Blob storage scripts
│   ├── s3/            # AWS S3 storage scripts
│   └── test-bulk-delete.sh
├── data/               # Data generation and cleanup
│   ├── generate-*.sh   # Gallery/memory generation scripts
│   ├── mock-data/      # Sample data creation
│   └── cleanup-galleries.sh
├── db/                 # Database management
│   ├── docker/         # Docker development setup
│   │   ├── dev-setup.sh
│   │   └── init/       # Database initialization
│   ├── migrate.ts      # Database migrations
│   ├── verify-constraints.ts
│   ├── debug-memories.js
│   ├── manage-user-roles.ts
│   └── test-migration.ts
└── ngrok/              # Development tools
```

## Available Scripts

### Database Management

- **`db/migrate.ts`** - Database migrations
- **`db/verify-constraints.ts`** - Verifies database constraints
- **`db/debug-memories.js`** - Debug memory/folder relationships
- **`db/manage-user-roles.ts`** - User role management
- **`db/test-migration.ts`** - Test database migrations

### Data Generation

- **`data/generate-test-memories.sh`** - Generate test memory data
- **`data/generate-test-images.sh`** - Generate test image data
- **`data/generate-galleries.sh`** - Generate gallery data
- **`data/cleanup-galleries.sh`** - Clean up gallery data

### Storage Management

- **`blob/vercel_blob/`** - Vercel Blob storage scripts
- **`blob/s3/`** - AWS S3 storage scripts
- **`blob/test-bulk-delete.sh`** - Test bulk deletion

### Development Setup

- **`db/docker/dev-setup.sh`** - Docker development environment setup
- **`ngrok/`** - Development tunneling tools
