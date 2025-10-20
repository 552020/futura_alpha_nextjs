# Tenenbaum Family Data Structure

This directory contains the seed data for the Tenenbaum family, used as sample data for testing and development.

## Directory Structure

```
src/db/fixtures/
├── assets/
│   └── tenenbaum/
│       ├── chas.jpeg
│       ├── eli.webp
│       ├── margot_richard_tent.jpg
│       ├── margot_richard_tent.mp4
│       ├── margot.jpg
│       ├── old_custer_NYRB.md
│       ├── old_custer_quarterly.md
│       ├── richard_meltdown.jpg
│       ├── richard.jpeg
│       ├── royal-tenenbaums-2000.pdf
│       ├── the_year_of_secret_umbrellas.md
│       ├── the_year_of_secret_umbrellas.docx
│       ├── the_year_of_secret_umbrellas.epub
│       ├── the_year_of_secret_umbrellas.odt
│       ├── the_year_of_secret_umbrellas.pdf
│       └── the_year_of_secret_umbrellas.rtf
└── tenenbaum/
    ├── seedTenenbaum.ts
    ├── margot.json
    ├── richie.json
    ├── chas.json
    ├── wes.json
    └── eli.json
```

## Users

1. **Margot Tenenbaum**
   - Email: margot@tenenbaum.com
   - Profile Image: `margot.jpg`
   - Memories:
     - "The Year of Secret Umbrellas" (multiple formats: md, docx, epub, odt, pdf, rtf)
     - Shared with: Eli Cash, Richie Tenenbaum

2. **Richie Tenenbaum**
   - Email: richie@tenenbaum.com
   - Profile Image: `richard.jpeg`
   - Memories:
     - Tent photo with Margot (`margot_richard_tent.jpg`)
     - Meltdown photo (`richard_meltdown.jpg`)
     - Both shared with: Margot Tenenbaum

3. **Eli Cash**
   - Email: eli@cash.com
   - Profile Image: `eli.webp`
   - Memories:
     - Old Custer NYRB Review (`old_custer_NYRB.md`)
     - Old Custer Quarterly Review (`old_custer_quarterly.md`)
     - Both shared with: Margot Tenenbaum

4. **Wes Anderson**
   - Email: wes@tenenbaum.com
   - Profile Image: `wes.jpg`
   - Memories:
     - Tent video (`margot_richard_tent.mp4`)
     - Shared with: Richie Tenenbaum, Margot Tenenbaum

## File Structure

```
assets/tenenbaum/
├── Profile Images
│   ├── eli.webp
│   ├── margot.jpg
│   ├── richard.jpeg
│   └── wes.jpg
├── Images
│   ├── margot_richard_tent.jpg
│   └── richard_meltdown.jpg
├── Videos
│   └── margot_richard_tent.mp4
└── Documents
    ├── old_custer_NYRB.md
    ├── old_custer_quarterly.md
    ├── the_year_of_secret_umbrellas.md
    ├── the_year_of_secret_umbrellas.docx
    ├── the_year_of_secret_umbrellas.epub
    ├── the_year_of_secret_umbrellas.odt
    ├── the_year_of_secret_umbrellas.pdf
    └── the_year_of_secret_umbrellas.rtf
```

## Seeding Process

The seeding process follows these steps:

1. Cleans up any existing test data
2. Creates user accounts for each family member
3. Uploads profile images to blob storage
4. Creates memories for each user:
   - Uploads files to blob storage
   - Creates database records
   - Sets up sharing relationships

## Running the Seed

To run the seed:

```bash
npm run db:seed
```

Note: All files must be present in the `assets/tenenbaum/` directory before running the seed. Missing files will cause the seed to fail.

## Memory Sharing Structure

The sharing relationships are:

- Richie's tent photo → shared with Margot
- Wes's mp4 → shared with Richard and Margot
- Richard's meltdown photo → shared with Margot
- Margot's secret umbrellas → shared with Eli and Richard
- Eli's Custer reviews → shared with Margot

## File Types

The seed data includes various file types to test different memory types:

- Images: jpg, jpeg, webp
- Videos: mp4
- Documents: md, docx, epub, odt, pdf, rtf

Each file is validated before upload and stored in blob storage with appropriate mime types.
