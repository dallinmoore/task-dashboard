# Paramify Vibe Coder Template

A production-ready template for vibe-coding full-stack apps: React Router v7
(SSR) + TypeScript + TailwindCSS, deployed as a Docker container behind a
Traefik reverse proxy with Google OAuth.

## Using this template with Claude

This repo ships a `CLAUDE.md` at the root describing the project's conventions
and its built-in tools (the authenticated user and the database), so Claude
builds on what's here instead of reinventing it.

- **Claude Code:** nothing to do — `CLAUDE.md` is loaded automatically every
  session. If you open Claude Code at a directory *above* this repo, point it
  here (`cd` into the project, or add the path) so it picks up the file.
- **Claude Desktop:** Desktop doesn't read `CLAUDE.md` automatically. For the
  best results, open the contents of `CLAUDE.md` and paste it into your Claude
  **Project → custom instructions**. (Or connect the Filesystem MCP server to
  this folder so Claude can read the file directly.)

## Getting started

Install dependencies and start the dev server with HMR:

```bash
npm install
npm run dev
```

Your app will be available at `http://localhost:5173`.

Type-check before shipping a change:

```bash
npm run typecheck
```

## Building for production

```bash
npm run build
```

Build output:

```
build/
├── client/    # Static assets
└── server/    # Server-side code
```

## Deployment

### Docker

```bash
docker build -t my-app .
docker run -p 3000:3000 my-app
```

The container can be deployed to any platform that runs Docker (Cloud Run, ECS,
Fly.io, Railway, etc.).

### DIY

The built-in `react-router-serve` server is production-ready. Deploy the output
of `npm run build` along with your `package.json` and lockfile.
