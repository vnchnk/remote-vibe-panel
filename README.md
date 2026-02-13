# Remote Vibe Panel

Mobile-first dev panel for managing remote servers from your phone. Built with Next.js 15, React 19, and Tailwind CSS 4.

## Features

- **Git** — stage, unstage, discard, commit, push, view diffs, browse file tree, search content
- **Terminal** — full interactive terminal via xterm.js + WebSocket (node-pty)
- **Docker** — list containers, view logs, restart services
- **Database** — browse PostgreSQL tables, run SQL queries

## Quick Start

### Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker (production)

```bash
git clone https://github.com/vnchnk/remote-vibe-panel.git
cd remote-vibe-panel
docker compose up -d --build
```

The panel will be available at `http://<host>:8080`.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PROJECT_DIR` | Path to the project directory to manage | `./` (docker: `/app/project`) |
| `DATABASE_URL` | PostgreSQL connection string (optional) | — |
| `PORT` | Server port | `3000` |

## Docker Compose

The default `docker-compose.yml` mounts the Docker socket and the project directory:

```yaml
services:
  devpanel:
    build: .
    ports:
      - "8080:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ${PROJECT_DIR:-./}:/app/project
    environment:
      - PROJECT_DIR=/app/project
      - DATABASE_URL=${DATABASE_URL:-}
    restart: unless-stopped
```

To manage a specific project on the server:

```bash
PROJECT_DIR=/path/to/your/project docker compose up -d --build
```

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4, xterm.js
- **Backend**: Custom Node.js server (Next.js + WebSocket), node-pty
- **Integrations**: dockerode (Docker API), pg (PostgreSQL)
