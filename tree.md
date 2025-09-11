.
├── .DS_Store
├── .env.local
├── .env.local.example
├── .eslintignore
├── .gitignore
├── .gitmodules
├── LICENSE
├── README.md
├── THIRD_PARTY_LICENSES.md
├── auth.md
├── auth.ts
├── components.json
├── drizzle.config.ts
├── eslint.config.mjs
├── instrumentation.ts
├── next-env.d.ts
├── next.config.ts
├── package.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── postcss.config.mjs
├── posthog.ts
├── public
│   ├── .DS_Store
│   ├── file.svg
│   ├── globe.svg
│   ├── hero
│   │   ├── abstract-1.jpg
│   │   ├── blue-sky.jpg
│   │   ├── diana_charles.jpg
│   │   ├── flowers-bw.jpg
│   │   ├── network-sky.jpg
│   │   ├── people-lights.jpg
│   │   ├── placeholder_img.svg
│   │   ├── placeholder_img_big.png
│   │   ├── plants.jpg
│   │   ├── rays.jpg
│   │   ├── red-sky.jpg
│   │   ├── sky-night.jpg
│   │   └── white-room.jpg
│   ├── images
│   │   ├── demo-thumbnail.png
│   │   ├── mouth of the seine, monet.jpg
│   │   └── segments
│   │       ├── black-mirror
│   │       │   ├── black_mirror_1.webp
│   │       │   ├── black_mirror_2.webp
│   │       │   ├── black_mirror_3.webp
│   │       │   ├── black_mirror_4.webp
│   │       │   ├── black_mirror_5.webp
│   │       │   └── black_mirror_6.webp
│   │       └── family
│   │           ├── bezos.png
│   │           ├── bezos_family_album.png
│   │           ├── bezos_gpt.png
│   │           ├── diana_charles.jpg
│   │           ├── family_1.webp
│   │           ├── family_2.png
│   │           ├── family_2.webp
│   │           ├── family_3.webp
│   │           ├── u3798426454_Colour_photograph_of_a_couple_sitting_with_their__718b5b63-6994-4964-9d3b-834ac5465713_2.png
│   │           ├── u3798426454_Colour_photograph_of_a_couple_sitting_with_their__7895c248-4368-4c59-8e3d-2312dddbb7db_0.png
│   │           └── white_room.png
│   ├── logo
│   │   ├── f.logo.svg
│   │   └── futura-logo.svg
│   ├── mock
│   │   ├── .DS_Store
│   │   ├── dashboard
│   │   │   ├── audio
│   │   │   │   ├── test_audio_1.mp3
│   │   │   │   ├── test_audio_2.mp3
│   │   │   │   ├── test_audio_3.mp3
│   │   │   │   ├── test_audio_4.mp3
│   │   │   │   └── test_audio_5.mp3
│   │   │   ├── documents
│   │   │   │   ├── test_document_1.md
│   │   │   │   ├── test_document_2.md
│   │   │   │   ├── test_document_3.md
│   │   │   │   ├── test_document_4.md
│   │   │   │   └── test_document_5.md
│   │   │   ├── images
│   │   │   │   ├── Charming_Memory_04.webp
│   │   │   │   ├── Enchanting_Moment_05.webp
│   │   │   │   ├── Luminous_Experience_03.webp
│   │   │   │   ├── Mesmerizing_Forest_02.webp
│   │   │   │   ├── Stunning_Castle_01.webp
│   │   │   │   ├── test_image_1.webp
│   │   │   │   ├── test_image_2.webp
│   │   │   │   ├── test_image_3.webp
│   │   │   │   ├── test_image_4.webp
│   │   │   │   └── test_image_5.webp
│   │   │   ├── notes
│   │   │   │   ├── test_note_1.txt
│   │   │   │   ├── test_note_2.txt
│   │   │   │   ├── test_note_3.txt
│   │   │   │   ├── test_note_4.txt
│   │   │   │   └── test_note_5.txt
│   │   │   └── video
│   │   │       ├── test_video_1.mp4
│   │   │       ├── test_video_2.mp4
│   │   │       ├── test_video_3.mp4
│   │   │       ├── test_video_4.mp4
│   │   │       └── test_video_5.mp4
│   │   ├── galleries
│   │   │   ├── landscape-gallery
│   │   │   │   ├── gallery.json
│   │   │   │   ├── image_03.webp
│   │   │   │   ├── image_11.webp
│   │   │   │   ├── image_12.webp
│   │   │   │   ├── photo_13.webp
│   │   │   │   ├── photo_15.webp
│   │   │   │   ├── picture_04.webp
│   │   │   │   ├── picture_05.webp
│   │   │   │   ├── picture_06.webp
│   │   │   │   ├── picture_10.webp
│   │   │   │   ├── shot_01.webp
│   │   │   │   ├── shot_02.webp
│   │   │   │   ├── shot_07.webp
│   │   │   │   ├── shot_08.webp
│   │   │   │   ├── shot_09.webp
│   │   │   │   └── shot_14.webp
│   │   │   ├── large-gallery
│   │   │   │   ├── gallery.json
│   │   │   │   ├── image_05.webp
│   │   │   │   ├── image_13.webp
│   │   │   │   ├── image_16.webp
│   │   │   │   ├── image_20.webp
│   │   │   │   ├── image_28.webp
│   │   │   │   ├── image_32.webp
│   │   │   │   ├── image_38.webp
│   │   │   │   ├── image_41.webp
│   │   │   │   ├── image_45.webp
│   │   │   │   ├── image_49.webp
│   │   │   │   ├── photo_01.webp
│   │   │   │   ├── photo_04.webp
│   │   │   │   ├── photo_07.webp
│   │   │   │   ├── photo_08.webp
│   │   │   │   ├── photo_10.webp
│   │   │   │   ├── photo_18.webp
│   │   │   │   ├── photo_24.webp
│   │   │   │   ├── photo_25.webp
│   │   │   │   ├── photo_26.webp
│   │   │   │   ├── photo_30.webp
│   │   │   │   ├── photo_33.webp
│   │   │   │   ├── photo_34.webp
│   │   │   │   ├── photo_36.webp
│   │   │   │   ├── photo_44.webp
│   │   │   │   ├── photo_46.webp
│   │   │   │   ├── picture_03.webp
│   │   │   │   ├── picture_09.webp
│   │   │   │   ├── picture_12.webp
│   │   │   │   ├── picture_14.webp
│   │   │   │   ├── picture_15.webp
│   │   │   │   ├── picture_19.webp
│   │   │   │   ├── picture_21.webp
│   │   │   │   ├── picture_22.webp
│   │   │   │   ├── picture_27.webp
│   │   │   │   ├── picture_29.webp
│   │   │   │   ├── picture_39.webp
│   │   │   │   ├── picture_42.webp
│   │   │   │   ├── picture_43.webp
│   │   │   │   ├── picture_47.webp
│   │   │   │   ├── picture_48.webp
│   │   │   │   ├── picture_50.webp
│   │   │   │   ├── shot_02.webp
│   │   │   │   ├── shot_06.webp
│   │   │   │   ├── shot_11.webp
│   │   │   │   ├── shot_17.webp
│   │   │   │   ├── shot_23.webp
│   │   │   │   ├── shot_31.webp
│   │   │   │   ├── shot_35.webp
│   │   │   │   ├── shot_37.webp
│   │   │   │   └── shot_40.webp
│   │   │   ├── mixed-gallery
│   │   │   │   ├── gallery.json
│   │   │   │   ├── image_01.webp
│   │   │   │   ├── image_04.webp
│   │   │   │   ├── image_05.webp
│   │   │   │   ├── image_08.webp
│   │   │   │   ├── image_10.webp
│   │   │   │   ├── image_13.webp
│   │   │   │   ├── image_18.webp
│   │   │   │   ├── image_19.webp
│   │   │   │   ├── photo_20.webp
│   │   │   │   ├── picture_02.webp
│   │   │   │   ├── picture_06.webp
│   │   │   │   ├── picture_15.webp
│   │   │   │   ├── picture_16.webp
│   │   │   │   ├── picture_17.webp
│   │   │   │   ├── shot_03.webp
│   │   │   │   ├── shot_07.webp
│   │   │   │   ├── shot_09.webp
│   │   │   │   ├── shot_11.webp
│   │   │   │   ├── shot_12.webp
│   │   │   │   └── shot_14.webp
│   │   │   ├── portrait-gallery
│   │   │   │   ├── gallery.json
│   │   │   │   ├── image_05.webp
│   │   │   │   ├── image_11.webp
│   │   │   │   ├── photo_01.webp
│   │   │   │   ├── photo_06.webp
│   │   │   │   ├── photo_08.webp
│   │   │   │   ├── photo_12.webp
│   │   │   │   ├── photo_13.webp
│   │   │   │   ├── photo_15.webp
│   │   │   │   ├── picture_03.webp
│   │   │   │   ├── picture_07.webp
│   │   │   │   ├── picture_10.webp
│   │   │   │   ├── picture_14.webp
│   │   │   │   ├── shot_02.webp
│   │   │   │   ├── shot_04.webp
│   │   │   │   └── shot_09.webp
│   │   │   ├── small-gallery
│   │   │   │   ├── gallery.json
│   │   │   │   ├── photo_02.webp
│   │   │   │   ├── photo_03.webp
│   │   │   │   ├── photo_04.webp
│   │   │   │   ├── picture_05.webp
│   │   │   │   └── shot_01.webp
│   │   │   └── wild-gallery
│   │   │       ├── gallery.json
│   │   │       ├── image_03.webp
│   │   │       ├── image_04.webp
│   │   │       ├── image_06.webp
│   │   │       ├── image_09.webp
│   │   │       ├── image_16.webp
│   │   │       ├── image_21.webp
│   │   │       ├── image_24.webp
│   │   │       ├── photo_01.webp
│   │   │       ├── photo_13.webp
│   │   │       ├── photo_17.webp
│   │   │       ├── photo_18.webp
│   │   │       ├── picture_07.webp
│   │   │       ├── picture_08.webp
│   │   │       ├── picture_10.webp
│   │   │       ├── picture_11.webp
│   │   │       ├── picture_12.webp
│   │   │       ├── picture_14.webp
│   │   │       ├── picture_15.webp
│   │   │       ├── picture_20.webp
│   │   │       ├── picture_22.webp
│   │   │       ├── picture_23.webp
│   │   │       ├── shot_02.webp
│   │   │       ├── shot_05.webp
│   │   │       ├── shot_19.webp
│   │   │       └── shot_25.webp
│   │   ├── wedding
│   │   │   ├── abstract-1.jpg
│   │   │   ├── blue-sky.jpg
│   │   │   ├── flowers-bw.jpg
│   │   │   ├── network-sky.jpg
│   │   │   ├── people-lights.jpg
│   │   │   ├── placeholder_img_big.png
│   │   │   ├── plants.jpg
│   │   │   ├── rays.jpg
│   │   │   ├── red-sky.jpg
│   │   │   ├── sky-night.jpg
│   │   │   └── white-room.jpg
│   │   ├── wedding_new
│   │   │   ├── placeholder_img_big.png
│   │   │   ├── plants.jpg
│   │   │   ├── rays.jpg
│   │   │   ├── red-sky.jpg
│   │   │   ├── sky-night.jpg
│   │   │   └── white-room.jpg
│   │   └── wedding_small
│   │       ├── abstract-1.jpg
│   │       ├── blue-sky.jpg
│   │       └── flowers-bw.jpg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── scripts
│   ├── add-storage-constraints.ts
│   ├── cleanup-galleries.sh
│   ├── generate-galleries.sh
│   ├── generate-gallery-images.sh
│   ├── generate-gallery-mock-data.ts
│   ├── generate-test-images.sh
│   ├── generate-test-memories.sh
│   ├── manage-user-roles.ts
│   ├── migrate.ts
│   ├── test-bulk-delete.sh
│   ├── test-enum-validation.ts
│   ├── test-migration.ts
│   ├── test-storage-schema.ts
│   ├── test-validation.ts
│   └── verify-constraints.ts
├── src
│   ├── .DS_Store
│   ├── app
│   │   ├── .DS_Store
│   │   ├── [lang]
│   │   │   ├── (chat)
│   │   │   │   ├── actions.ts
│   │   │   │   ├── chat
│   │   │   │   │   └── [id]
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── opengraph-image.png
│   │   │   │   ├── page.tsx
│   │   │   │   └── twitter-image.png
│   │   │   ├── .DS_Store
│   │   │   ├── [segment]
│   │   │   │   ├── actions.ts
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── about
│   │   │   │   └── page.tsx
│   │   │   ├── contact
│   │   │   │   └── page.tsx
│   │   │   ├── contacts
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard
│   │   │   │   ├── [id]
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── folder
│   │   │   │   │   └── [id]
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   └── sample-data.ts
│   │   │   ├── dictionaries
│   │   │   │   ├── about
│   │   │   │   │   ├── de.json
│   │   │   │   │   └── en.json
│   │   │   │   ├── base
│   │   │   │   │   ├── de.json
│   │   │   │   │   ├── en.json
│   │   │   │   │   ├── es.json
│   │   │   │   │   ├── fr.json
│   │   │   │   │   ├── it.json
│   │   │   │   │   ├── pl.json
│   │   │   │   │   ├── pt.json
│   │   │   │   │   └── zh.json
│   │   │   │   ├── faq
│   │   │   │   │   ├── de.json
│   │   │   │   │   └── en.json
│   │   │   │   ├── onboarding
│   │   │   │   │   ├── de.json
│   │   │   │   │   └── en.json
│   │   │   │   └── segments
│   │   │   │       ├── black-mirror
│   │   │   │       │   ├── black-mirror.md
│   │   │   │       │   ├── de.json
│   │   │   │       │   └── en.json
│   │   │   │       └── family
│   │   │   │           ├── de.json
│   │   │   │           ├── en.json
│   │   │   │           └── family.md
│   │   │   ├── faq
│   │   │   │   └── page.tsx
│   │   │   ├── feed
│   │   │   │   └── page.tsx
│   │   │   ├── gallery
│   │   │   │   ├── [id]
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── preview
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── generated-gallery-data.ts
│   │   │   │   ├── page.md
│   │   │   │   ├── page.tsx
│   │   │   │   ├── sample-data.ts
│   │   │   │   └── sample-gallery-data.ts
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── onboarding
│   │   │   │   ├── items-upload
│   │   │   │   │   ├── OnboardModal.md
│   │   │   │   │   ├── items-upload-client-experiment.tsx
│   │   │   │   │   ├── items-upload-client.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   └── profile
│   │   │   │       └── page.tsx
│   │   │   ├── page.tsx
│   │   │   ├── privacy
│   │   │   │   └── page.tsx
│   │   │   ├── shared
│   │   │   │   ├── [id]
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── sign-ii-only
│   │   │   │   └── page.tsx
│   │   │   ├── signin
│   │   │   │   └── page.tsx
│   │   │   ├── terms
│   │   │   │   └── page.tsx
│   │   │   └── user
│   │   │       ├── .DS_Store
│   │   │       ├── [id]
│   │   │       │   └── profile
│   │   │       │       └── page.tsx
│   │   │       ├── icp
│   │   │       │   ├── App.md
│   │   │       │   ├── page.md
│   │   │       │   └── page.tsx
│   │   │       ├── profile
│   │   │       │   └── page.tsx
│   │   │       └── settings
│   │   │           └── page.tsx
│   │   ├── api
│   │   │   ├── README.md
│   │   │   ├── auth
│   │   │   │   ├── [...nextauth]
│   │   │   │   │   └── route.ts
│   │   │   │   ├── __tests__
│   │   │   │   ├── clear-principal
│   │   │   │   ├── link-ii
│   │   │   │   │   └── route.ts
│   │   │   │   └── unlink-ii
│   │   │   ├── chat
│   │   │   │   ├── [id]
│   │   │   │   │   └── stream
│   │   │   │   │       └── route.ts
│   │   │   │   ├── demo
│   │   │   │   │   └── route.ts
│   │   │   │   ├── route.ts
│   │   │   │   └── schema.ts
│   │   │   ├── document
│   │   │   │   └── route.ts
│   │   │   ├── files
│   │   │   │   └── upload
│   │   │   │       └── route.ts
│   │   │   ├── galleries
│   │   │   │   ├── [id]
│   │   │   │   │   ├── presence
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── share
│   │   │   │   │       └── route.ts
│   │   │   │   ├── __tests__
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── basic.test.ts
│   │   │   │   │   ├── gallery-logic.test.ts
│   │   │   │   │   ├── route-id.test.ts
│   │   │   │   │   ├── route-post.test.ts
│   │   │   │   │   ├── route-share.test.ts
│   │   │   │   │   └── route-shared.test.ts
│   │   │   │   ├── aggregation
│   │   │   │   ├── folders
│   │   │   │   │   └── route.ts
│   │   │   │   ├── route.md
│   │   │   │   ├── route.ts
│   │   │   │   ├── shared
│   │   │   │   │   └── route.ts
│   │   │   │   └── utils.ts
│   │   │   ├── history
│   │   │   │   └── route.ts
│   │   │   ├── ii
│   │   │   │   ├── challenge
│   │   │   │   │   └── route.ts
│   │   │   │   └── verify-nonce
│   │   │   │       └── route.ts
│   │   │   ├── me
│   │   │   │   └── storage
│   │   │   │       └── route.ts
│   │   │   ├── memories
│   │   │   │   ├── [id]
│   │   │   │   │   ├── download
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── share
│   │   │   │   │   │   ├── route.md
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── share-link
│   │   │   │   │       ├── code
│   │   │   │   │       │   └── route.ts
│   │   │   │   │       └── route.ts
│   │   │   │   ├── [type]
│   │   │   │   │   └── [id]
│   │   │   │   │       └── presence
│   │   │   │   ├── __tests__
│   │   │   │   ├── presence
│   │   │   │   │   └── route.ts
│   │   │   │   ├── queries.md
│   │   │   │   ├── queries.ts
│   │   │   │   ├── route.ts
│   │   │   │   ├── shared
│   │   │   │   │   └── route.ts
│   │   │   │   ├── upload
│   │   │   │   │   ├── file
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── folder
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── onboarding
│   │   │   │   │   │   ├── file
│   │   │   │   │   │   │   ├── route.md
│   │   │   │   │   │   │   └── route.ts
│   │   │   │   │   │   ├── folder
│   │   │   │   │   │   │   └── route.ts
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── utils.ts
│   │   │   │   ├── utils
│   │   │   │   │   ├── access.ts
│   │   │   │   │   ├── email.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── memory.ts
│   │   │   │   └── utils.ts
│   │   │   ├── storage
│   │   │   │   ├── edges
│   │   │   │   │   └── route.ts
│   │   │   │   └── sync-status
│   │   │   │       └── route.ts
│   │   │   ├── suggestions
│   │   │   │   └── route.ts
│   │   │   ├── test
│   │   │   │   ├── auth
│   │   │   │   │   └── route.ts
│   │   │   │   └── hello
│   │   │   │       └── route.ts
│   │   │   ├── tests
│   │   │   │   └── mailgun
│   │   │   │       └── route.ts
│   │   │   ├── upload
│   │   │   │   ├── intent
│   │   │   │   │   └── route.ts
│   │   │   │   └── verify
│   │   │   │       └── route.ts
│   │   │   ├── users
│   │   │   │   ├── [id]
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── utils.ts
│   │   │   └── vote
│   │   │       └── route.ts
│   │   ├── favicon.ico
│   │   └── tests
│   │       ├── files
│   │       │   ├── [id]
│   │       │   │   ├── file-detail-editor.tsx
│   │       │   │   └── page.tsx
│   │       │   ├── page.tsx
│   │       │   └── upload
│   │       │       └── page.tsx
│   │       ├── layout.tsx
│   │       ├── mailgun
│   │       │   └── page.tsx
│   │       ├── posthog
│   │       │   └── page.tsx
│   │       ├── storage-badges
│   │       │   └── page.tsx
│   │       └── tailwind
│   │           ├── layout.tsx
│   │           └── page.tsx
│   ├── artifacts
│   │   ├── actions.ts
│   │   ├── code
│   │   │   ├── client.tsx
│   │   │   └── server.ts
│   │   ├── image
│   │   │   └── client.tsx
│   │   ├── sheet
│   │   │   ├── client.tsx
│   │   │   └── server.ts
│   │   └── text
│   │       ├── client.tsx
│   │       └── server.ts
│   ├── components
│   │   ├── auth
│   │   │   ├── access-denied.tsx
│   │   │   ├── auth-components.tsx
│   │   │   ├── require-auth.tsx
│   │   │   ├── user-button-client-with-ii.tsx
│   │   │   ├── user-button-client.tsx
│   │   │   └── user-button.tsx
│   │   ├── chat
│   │   │   ├── livechat-wrapper.tsx
│   │   │   ├── livechat.tsx
│   │   │   ├── tawk-chat-wrapper.tsx
│   │   │   └── tawk-chat.tsx
│   │   ├── chat-ai
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── artifact-actions.tsx
│   │   │   ├── artifact-close-button.tsx
│   │   │   ├── artifact-messages.tsx
│   │   │   ├── artifact.tsx
│   │   │   ├── auth-form.tsx
│   │   │   ├── chat-header.tsx
│   │   │   ├── chat.tsx
│   │   │   ├── code-editor.tsx
│   │   │   ├── console.tsx
│   │   │   ├── create-artifact.tsx
│   │   │   ├── data-stream-handler.tsx
│   │   │   ├── data-stream-provider.tsx
│   │   │   ├── diffview.tsx
│   │   │   ├── document-preview.tsx
│   │   │   ├── document-skeleton.tsx
│   │   │   ├── document.tsx
│   │   │   ├── elements
│   │   │   │   ├── actions.tsx
│   │   │   │   ├── branch.tsx
│   │   │   │   ├── code-block.tsx
│   │   │   │   ├── context.tsx
│   │   │   │   ├── conversation.tsx
│   │   │   │   ├── image.tsx
│   │   │   │   ├── inline-citation.tsx
│   │   │   │   ├── loader.tsx
│   │   │   │   ├── message.tsx
│   │   │   │   ├── prompt-input.tsx
│   │   │   │   ├── reasoning.tsx
│   │   │   │   ├── response.tsx
│   │   │   │   ├── source.tsx
│   │   │   │   ├── suggestion.tsx
│   │   │   │   ├── task.tsx
│   │   │   │   ├── tool.tsx
│   │   │   │   └── web-preview.tsx
│   │   │   ├── greeting.tsx
│   │   │   ├── icons.tsx
│   │   │   ├── image-editor.tsx
│   │   │   ├── message-actions.tsx
│   │   │   ├── message-editor.tsx
│   │   │   ├── message-reasoning.tsx
│   │   │   ├── message.tsx
│   │   │   ├── messages.tsx
│   │   │   ├── model-selector.tsx
│   │   │   ├── multimodal-input.tsx
│   │   │   ├── preview-attachment.tsx
│   │   │   ├── sheet-editor.tsx
│   │   │   ├── sidebar-history-item.tsx
│   │   │   ├── sidebar-history.tsx
│   │   │   ├── sidebar-toggle.tsx
│   │   │   ├── sidebar-user-nav.tsx
│   │   │   ├── sign-out-form.tsx
│   │   │   ├── submit-button.tsx
│   │   │   ├── suggested-actions.tsx
│   │   │   ├── suggestion.tsx
│   │   │   ├── text-editor.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toolbar.tsx
│   │   │   ├── version-footer.tsx
│   │   │   ├── visibility-selector.tsx
│   │   │   └── weather.tsx
│   │   ├── common
│   │   │   ├── base-card.tsx
│   │   │   ├── base-grid.tsx
│   │   │   ├── base-top-bar.tsx
│   │   │   ├── error-state.tsx
│   │   │   ├── loading-spinner.tsx
│   │   │   ├── memory-storage-badge.tsx
│   │   │   ├── mode-toggle.tsx
│   │   │   └── storage-status-badge.tsx
│   │   ├── dashboard
│   │   │   ├── dashboard-top-bar.tsx
│   │   │   └── folder-top-bar.tsx
│   │   ├── galleries
│   │   │   ├── create-gallery-modal.tsx
│   │   │   ├── folder-selector.tsx
│   │   │   ├── forever-storage-progress-modal.tsx
│   │   │   ├── gallery-card.tsx
│   │   │   ├── gallery-grid.tsx
│   │   │   ├── gallery-list.tsx
│   │   │   ├── gallery-storage-summary.tsx
│   │   │   └── gallery-top-bar.tsx
│   │   ├── i18n
│   │   │   └── language-switcher.tsx
│   │   ├── layout
│   │   │   ├── bottom-nav.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── header.tsx
│   │   │   ├── nav-bar.tsx
│   │   │   └── sidebar.tsx
│   │   ├── legacy
│   │   │   └── hero.tsx
│   │   ├── marketing
│   │   │   ├── hero-demo.tsx
│   │   │   ├── hero.tsx
│   │   │   └── value-journey.tsx
│   │   ├── memory
│   │   │   ├── item-upload-button.tsx
│   │   │   ├── memory-actions.tsx
│   │   │   ├── memory-card.tsx
│   │   │   ├── memory-grid.tsx
│   │   │   ├── memory-status.tsx
│   │   │   ├── memory-viewer.tsx
│   │   │   └── share-dialog.tsx
│   │   ├── onboarding
│   │   │   ├── common
│   │   │   │   ├── image-preview.tsx
│   │   │   │   ├── step-container.tsx
│   │   │   │   └── step-navigation.tsx
│   │   │   ├── hooks
│   │   │   │   └── use-step-navigation.ts
│   │   │   ├── onboard-modal.tsx
│   │   │   └── steps
│   │   │       ├── share-step.tsx
│   │   │       ├── sign-up-step.tsx
│   │   │       └── user-info-step.tsx
│   │   ├── providers
│   │   │   ├── query-provider.tsx
│   │   │   └── theme-provider.tsx
│   │   ├── ui
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── aspect-ratio.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── carousel.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── hover-card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── loading-spinner.tsx
│   │   │   ├── navigation-menu.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   └── tooltip.tsx
│   │   ├── user
│   │   │   ├── icp-card.tsx
│   │   │   ├── ii-coauth-controls.tsx
│   │   │   ├── linked-accounts.tsx
│   │   │   ├── profile-header.tsx
│   │   │   ├── profile-info.tsx
│   │   │   ├── profile-stats.tsx
│   │   │   ├── profile.tsx
│   │   │   ├── settings-button.tsx
│   │   │   ├── storage-card.tsx
│   │   │   └── storage-settings.tsx
│   │   └── utils
│   │       ├── posthog-provider.tsx
│   │       └── translation-validation.ts
│   ├── contexts
│   │   ├── interface-context.tsx
│   │   └── onboarding-context.tsx
│   ├── hooks
│   │   ├── __tests__
│   │   │   ├── use-ii-coauth.test.ts
│   │   │   └── useStoragePreferences.test.tsx
│   │   ├── handleFileChange.md
│   │   ├── use-artifact.ts
│   │   ├── use-auto-resume.ts
│   │   ├── use-chat-visibility.ts
│   │   ├── use-ii-coauth.ts
│   │   ├── use-memory-storage-status.ts
│   │   ├── use-messages.tsx
│   │   ├── use-mobile.tsx
│   │   ├── use-scroll-to-bottom.tsx
│   │   ├── use-storage-preferences.ts
│   │   ├── use-toast.ts
│   │   ├── use-upload-storage.ts
│   │   ├── useBackendActor.ts
│   │   └── user-file-upload.ts
│   ├── ic
│   │   ├── .DS_Store
│   │   ├── actor-factory.ts
│   │   ├── agent.ts
│   │   ├── backend.md
│   │   ├── backend.ts
│   │   ├── declarations
│   │   │   ├── .DS_Store
│   │   │   ├── backend
│   │   │   │   ├── backend.did
│   │   │   │   ├── backend.did.d.ts
│   │   │   │   ├── backend.did.js
│   │   │   │   ├── index.d.ts
│   │   │   │   └── index.js
│   │   │   ├── canister_factory
│   │   │   │   ├── canister_factory.did
│   │   │   │   ├── canister_factory.did.d.ts
│   │   │   │   ├── canister_factory.did.js
│   │   │   │   ├── index.d.ts
│   │   │   │   └── index.js
│   │   │   ├── frontend
│   │   │   └── internet_identity
│   │   │       ├── index.d.ts
│   │   │       ├── index.js
│   │   │       ├── internet_identity.did
│   │   │       ├── internet_identity.did.d.ts
│   │   │       └── internet_identity.did.js
│   │   └── ii.ts
│   ├── lib
│   │   ├── ai
│   │   │   ├── entitlements.ts
│   │   │   ├── models.mock.ts
│   │   │   ├── models.test.ts
│   │   │   ├── models.ts
│   │   │   ├── prompts.ts
│   │   │   ├── provider-factory.ts
│   │   │   ├── providers
│   │   │   │   ├── theta.ts
│   │   │   │   └── vercel.ts
│   │   │   ├── providers.ts
│   │   │   └── tools
│   │   │       ├── create-document.ts
│   │   │       ├── get-weather.ts
│   │   │       ├── request-suggestions.ts
│   │   │       └── update-document.ts
│   │   ├── artifacts
│   │   │   └── server.ts
│   │   ├── blob.ts
│   │   ├── constants.ts
│   │   ├── editor
│   │   │   ├── config.ts
│   │   │   ├── diff.js
│   │   │   ├── functions.tsx
│   │   │   ├── react-renderer.tsx
│   │   │   └── suggestions.tsx
│   │   ├── error-handling.ts
│   │   ├── errors.ts
│   │   ├── ii-client.ts
│   │   ├── ii-coauth-guard.ts
│   │   ├── ii-coauth-ttl.ts
│   │   ├── ii-nonce.ts
│   │   ├── requireAuth.ts
│   │   ├── server-actor.ts
│   │   ├── storage-validation.ts
│   │   └── utils.ts
│   ├── middleware.md
│   ├── middleware.ts
│   ├── services
│   │   ├── gallery.ts
│   │   ├── icp-gallery.ts
│   │   ├── icp-upload.ts
│   │   ├── memories.ts
│   │   └── upload.ts
│   ├── test
│   │   ├── advanced-patterns.test.ts
│   │   ├── auth-bypass-testing.test.ts
│   │   ├── e2e-supertest.test.ts
│   │   ├── hybrid-auth-testing-session.test.ts
│   │   ├── hybrid-auth-testing.test.ts
│   │   ├── icp-endpoints.test.ts
│   │   ├── learn-auth-mocking-advanced.test.ts
│   │   ├── learn-auth-mocking-practical.test.ts
│   │   ├── learn-google-auth-mocking.test.ts
│   │   ├── learn-jwt-token-generation.test.ts
│   │   ├── learn-supertest.test.ts
│   │   ├── minimal.test.ts
│   │   ├── mock-function-demo.test.ts
│   │   ├── setup.ts
│   │   ├── simple-endpoint-refactored.test.ts
│   │   ├── simple-endpoint.test.ts
│   │   ├── supertest-basics.test.ts
│   │   ├── utility.test.ts
│   │   └── utils
│   │       ├── jwt-generator.ts
│   │       ├── session-generator.ts
│   │       └── test-server.ts
│   ├── tests
│   ├── types
│   │   ├── ai.ts
│   │   ├── gallery.ts
│   │   ├── memory.ts
│   │   └── next-auth.d.ts
│   └── utils
│       ├── authentication.ts
│       ├── dictionaries.ts
│       ├── mailgun.ts
│       ├── memories.ts
│       ├── navigation.ts
│       └── normalizeMemories.ts
├── tests
│   ├── api
│   ├── e2e
│   │   ├── artifacts.test.ts
│   │   ├── chat.test.ts
│   │   ├── reasoning.test.ts
│   │   └── session.test.ts
│   ├── fixtures.ts
│   ├── helpers.ts
│   ├── pages
│   │   ├── artifact.ts
│   │   ├── auth.ts
│   │   └── chat.ts
│   ├── prompts
│   │   ├── basic.ts
│   │   ├── routes.ts
│   │   └── utils.ts
│   ├── routes
│   │   ├── chat.test.ts
│   │   └── document.test.ts
│   ├── storage-edge-creation.test.ts
│   ├── test-presence-api.sh
│   ├── test-real-upload.sh
│   ├── test-storage-edge-integration.sh
│   ├── test-storage-edge-simulation.sh
│   └── test-storage-edges-api.sh
├── tree.md
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── vercel.json
└── vitest.config.ts

191 directories, 710 files
