# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cloney is a Shopify embedded app that uses AI and web scraping to clone websites into Shopify stores. Users input a URL, the app scrapes the content, uses OpenAI to analyze and structure it, then provides an editor to customize before importing to Shopify.

## Commands

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npx prisma generate  # Regenerate Prisma client (auto-runs on npm install)
npx prisma db push   # Push schema changes to database
```

## Architecture

### Generation Pipeline Flow

1. **User Input** → Theme selection + source URL on `/generate` page
2. **POST /api/generate** → Creates Generation record, starts background pipeline
3. **Pipeline** (`src/lib/pipeline/generator.ts`):
   - Scrapes website (Cheerio for static, Playwright for dynamic)
   - Sends to OpenAI for content extraction
   - Parses response into products, colors, fonts, branding
4. **Editor Session** → Created from generation data, stored in EditorSession table
5. **User Edits** → Zustand state + auto-persisted to `/api/editor/session/[id]`
6. **Import** → POST `/api/editor/import` creates theme and products on Shopify

### Key Directories

- `src/app/api/` - Next.js API routes (auth, generate, editor, webhooks)
- `src/lib/pipeline/` - Core generation pipeline orchestrator
- `src/lib/scraper/` - Website scraping (static.ts, dynamic.ts)
- `src/lib/ai/` - OpenAI integration, prompts, response parsing
- `src/lib/shopify/` - Shopify API operations (auth, themes, products)
- `src/lib/themes/` - Theme system (loader, Liquid engine, adapters)
- `src/components/editor/` - Visual editor UI components
- `src/components/preview/` - Live theme preview with Liquid rendering
- `src/stores/` - Zustand state management
- `public/themes/` - Theme template files (dawn, tinker)

### State Management

- **editorStore.ts** - Homepage content, products, styles, active tabs
- **themeStore.ts** - Theme selection state
- **useEditorPersistence.ts** - Auto-saves editor state to API

### Theme System

Themes live in `public/themes/[themeId]/` with:
- `manifest.json` - Theme metadata and section definitions
- `sections/` - Liquid template files
- `assets/` - CSS and other assets

Section mappers in `src/lib/themes/adapters/` translate content to theme-specific formats.

### Database Models (Prisma)

- **Shop** - Installed Shopify stores with encrypted access tokens
- **Generation** - Cloning jobs (status, progress, sourceUrl, AI response)
- **EditorSession** - User editing sessions linked to generations
- **Product** - Generated products awaiting import

## Key Implementation Details

- App runs embedded in Shopify Admin via App Bridge (iframe context)
- Shopify access tokens encrypted before database storage (`src/lib/utils/encryption.ts`)
- Liquid templates rendered client-side with liquidjs for live preview
- Generation pipeline runs async/fire-and-forget after API call
- OAuth flow: `/api/auth` → Shopify → `/api/auth/callback` with HMAC verification

## Environment Variables

Required in `.env`:
- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_SCOPES`
- `DATABASE_URL` (PostgreSQL)
- `OPENAI_API_KEY`
- `ENCRYPTION_KEY` (32-byte key for token encryption)
- `NEXT_PUBLIC_APP_URL` (deployment URL)
