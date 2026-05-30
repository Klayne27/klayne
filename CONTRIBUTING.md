# Contributing to Klayne

Thanks for helping improve Klayne. This project is a full-stack React and Express app, so most changes touch either `frontend/src` feature modules or `backend` route/controller/model files.

## Fork and Clone

1. Fork the repository on GitHub.
2. Clone your fork:

```bash
git clone https://github.com/Klayne27/klayne.git
cd klayne
```

3. Add the original repository as `upstream`:

```bash
git remote add upstream https://github.com/Klayne27/klayne.git
```

## Development Setup

Install dependencies:

```bash
npm install
npm install --prefix frontend
```

Create your local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Run the backend:

```bash
npm run dev
```

Run the frontend in a second terminal:

```bash
npm run dev --prefix frontend
```

The frontend runs on `http://localhost:3000` and proxies API calls to `http://localhost:5000`.

## Code Style and Project Patterns

- Use ES modules throughout the backend and frontend.
- Backend files are split by responsibility: `routes` define endpoints, `controllers` hold business logic, `models` define Mongoose schemas, `middleware` handles auth/admin checks, and `lib/utils` holds shared helpers.
- Frontend API calls live in `frontend/src/api`; React Query hooks live beside their feature in `features/*/*Hooks`.
- Shared frontend state uses Zustand stores in `frontend/src/store`.
- Components use PascalCase file names and functions. Hooks use `useSomething` naming.
- The app uses Tailwind CSS and DaisyUI classes heavily. Prefer existing UI patterns before adding new styling systems.
- Keep route changes mirrored between backend `routes/*.js`, frontend `src/api/*.js`, and related React Query hooks.
- For realtime features, update both the backend Socket.io event and the relevant frontend socket hook/context listener.
- Do not commit generated build output, local env files, logs, or secrets.

## Branches and Pull Requests

1. Sync your fork:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

2. Create a feature branch:

```bash
git checkout -b feature/short-description
```

3. Make your changes and run checks:

```bash
npm run lint --prefix frontend
npm run build --prefix frontend
```

4. Commit with a clear message:

```bash
git commit -m "Add board comment reaction handling"
```

5. Push and open a pull request:

```bash
git push origin feature/short-description
```

In the PR description, include what changed, screenshots for UI changes, any new environment variables, and how you tested it.

## Welcome Contributions

- Bug fixes and regression fixes
- Accessibility improvements
- UI polish that follows existing patterns
- Performance improvements for feeds, chat, and dashboard views
- Test coverage for backend controllers and frontend hooks
- Documentation improvements
- Security hardening
- Better error handling and validation

For large features, open an issue first so the scope can be discussed before implementation.
