# Issue: Footnote Rendering and Styling

## Status

🔴 Open

## Date

2026-01-08

## Description

Journal post footnotes are rendering with remark-gfm but have styling issues that make them difficult to read and use.

## Problems

### 1. Missing Numbering

The footnotes are generated as an ordered list `<ol>` with `<li id="user-content-fn-1">` etc., but the numbers (1, 2, 3...) are not visible before each footnote entry in the rendered page.

Expected:

```
Footnotes
1. Examples of gallery platforms...
2. Wedding photographers frequently...
```

Current:

```
Footnotes
Examples of gallery platforms...
Wedding photographers frequently...
```

### 2. Font Size Too Large

The footnote text appears in the same font size as the body text. Footnotes should be rendered in a smaller font size for visual hierarchy and readability.

## Technical Details

- Using `remark-gfm` with `remark-rehype` and `rehype-stringify`
- Footnotes render in a `<section data-footnotes class="footnotes">`
- Contains `<h2 class="sr-only" id="footnote-label">Footnotes</h2>`
- List items have IDs like `id="user-content-fn-1"`, `id="user-content-fn-2"`, etc.
- The HTML structure is correct but CSS styling is missing

## Root Cause

The journal post CSS styling (in `/src/app/[lang]/journal/[slug]/page.tsx`) does not include specific styles for:

1. Ordered list numbering in footnotes section
2. Font size reduction for footnotes
3. The `section[data-footnotes]` element

## Solution

Add CSS styling to the journal post page for the footnotes section:

```css
[&_section[data-footnotes]]:text-sm
[&_section[data-footnotes]_ol]:list-decimal
[&_section[data-footnotes]_ol]:ml-6
```

Or create dedicated styles for the footnotes section.

## Files Involved

- `/src/app/[lang]/journal/[slug]/page.tsx` - Journal post rendering
- `/src/app/[lang]/journal/utils.ts` - Markdown processing pipeline

## Priority

Medium - Affects readability and professional appearance of journal posts

## Notes

- The underlying HTML structure is correct
- Links (both reference and back-reference) work properly
- Only CSS styling is needed to complete the implementation
