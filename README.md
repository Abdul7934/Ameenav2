<div align="center">
  <h1>Ameenav2</h1>
  <p>AI-powered study and quiz assistant built with React + Vite + TypeScript.</p>
</div>

## Overview

Ameenav2 is a lightweight web app that helps you learn faster using Gemini-powered prompts, quick quizzes, and study workflows. It ships with a clean UI, dark mode, and sensible defaults.

## Features

- Study and quiz pages wired to an AI backend
- Mermaid diagrams component for visualizations
- Dark/light theme toggle
- Error boundary and loading states
- Type-safe React + TypeScript setup
- Tailwind CSS styling, Vite dev/build

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Google Gemini API (via `services/geminiService.ts`)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Google Gemini API key

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create an `.env.local` file in the project root and add:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

Vite will print a local URL (typically `http://localhost:5173`).

## Scripts

- `npm run dev` – Start Vite dev server
- `npm run build` – Production build to `dist/`
- `npm run preview` – Preview production build

## Project Structure

```text
components/           # Reusable UI components
contexts/             # React contexts (e.g., uploaded content)
pages/                # Route-level pages (Home, Study, Quiz, Dashboard)
services/             # API clients (e.g., geminiService.ts)
hooks/                # Custom React hooks
index.tsx             # App entry
App.tsx               # App shell / routing
tailwind.config.js    # Tailwind config
vite.config.ts        # Vite config
```

## Environment Variables

Create `.env.local` in the project root:

```bash
GEMINI_API_KEY=your_api_key_here
```

The app reads this key to call Gemini via `services/geminiService.ts`.

## Deployment

You can deploy the `dist/` output to any static host (Netlify, Vercel, GitHub Pages):

1. Build: `npm run build`
2. Deploy the `dist/` directory per your host’s instructions
3. Ensure the `GEMINI_API_KEY` is configured as an environment variable on your host (if you proxy requests server-side)

## Troubleshooting

- Missing or invalid `GEMINI_API_KEY` will cause AI features to fail. Double-check `.env.local` or your host env settings.
- If styles don’t load, ensure Tailwind is installed and `index.css` is imported in `index.tsx`.

## License

MIT
