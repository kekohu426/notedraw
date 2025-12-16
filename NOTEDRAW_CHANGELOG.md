# NoteDraw V2 - MKSaaS Template Modifications Changelog

This document tracks all changes made to the MKSaaS template for the NoteDraw visual note generator application.

## Version 1.0.0 (2025-12-11)

### Database Schema
- Added `noteProject` table in `src/db/schema/index.ts`
  - Fields: id, userId, title, inputText, language, visualStyle, status, errorMessage, createdAt, updatedAt
- Added `noteCard` table in `src/db/schema/index.ts`
  - Fields: id, projectId, order, originalText, structure (JSON), prompt, imageUrl, status, errorMessage, createdAt, updatedAt

### AI Module (`src/ai/notedraw/`)
- Created `types.ts` - Type definitions for VisualStyle, Language, NoteUnit, LeftBrainData, RightBrainData
- Created `prompts.ts` - AI prompt templates for organizer, designer, and painter agents
- Created `organizer.ts` - Text splitting and structure extraction (Left Brain)
- Created `designer.ts` - Visual design generation (Right Brain)
- Created `painter.ts` - Image generation using Fal.ai flux model
- Created `index.ts` - Main generate() and regenerateUnit() functions

### Server Actions (`src/actions/notedraw.ts`)
- `createProjectAction` - Create new note project
- `generateNotesAction` - Main generation flow with credit consumption
- `regenerateCardAction` - Regenerate single card image
- `getProjectAction` - Get project details with cards
- `getUserProjectsAction` - Get all user projects

### Frontend Components (`src/components/notedraw/`)
- `StyleSelector.tsx` - Visual style selection (5 styles: sketch, business, cute, minimal, chalkboard)
- `InputPanel.tsx` - Text input with character count
- `GenerateButton.tsx` - Generation trigger button
- `Workbench.tsx` - AI processing status display
- `ResultGallery.tsx` - Generated cards gallery with regeneration
- `NoteDrawApp.tsx` - Main app component with state management
- `index.ts` - Component exports

### Pages (`src/app/[locale]/(protected)/notedraw/`)
- `page.tsx` - Main NoteDraw page
- `history/page.tsx` - Note history page
- `history/note-history-list.tsx` - History list component

### Routes (`src/routes.ts`)
- Added `NoteDraw = '/notedraw'`
- Added `NoteDrawHistory = '/notedraw/history'`
- Added both routes to `protectedRoutes` array

### Configuration Changes

#### `src/config/website.tsx`
- Changed `routes.defaultLoginRedirect` from `/dashboard` to `/notedraw`
- Changed `auth.enableGoogleLogin` from `true` to `false`
- Changed `auth.enableGithubLogin` from `true` to `false`

#### `src/config/sidebar-config.tsx`
- Simplified sidebar to show only NoteDraw features:
  - Create Note (links to /notedraw)
  - History (links to /notedraw/history)
  - Settings
- Removed Dashboard, AI Demo, Chat, Admin sections

### Internationalization (`messages/`)

#### `en.json` - Added under `Dashboard`:
```json
"notedraw": {
  "create": { "title": "Create Note" },
  "history": { "title": "History" },
  "styles": {
    "sketch": { "name": "Sketch", "description": "Hand-drawn style with pencil strokes" },
    "business": { "name": "Business", "description": "Professional style for work presentations" },
    "cute": { "name": "Cute", "description": "Playful style with colorful illustrations" },
    "minimal": { "name": "Minimal", "description": "Clean and simple style" },
    "chalkboard": { "name": "Chalkboard", "description": "Classic chalk on blackboard style" }
  },
  "input": { ... },
  "generate": { ... },
  "workbench": { ... },
  "results": { ... }
}
```

#### `zh.json` - Added corresponding Chinese translations

### Bug Fixes
- Fixed `hasEnoughCredits` function call signature (changed from positional args to object)
- Removed unsupported `maxTokens` parameter from generateText calls
- Changed `isLoading` to `loading` prop in GenerateButton component
- Fixed `getUserProjectsAction()` to be called without arguments

---

## Environment Variables Required

Add to `.env.local`:
```
# Google AI (for Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here

# Fal.ai (for image generation)
FAL_KEY=your_key_here
```

## Credit Consumption
- Content analysis: 1 credit
- Image generation: 5 credits per image
- Image regeneration: 5 credits per image
