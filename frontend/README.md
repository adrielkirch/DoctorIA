# DoctorIA Engine

A modern Vue 3 + TypeScript ChatGPT-like AI interface with human fallback and social media integration capabilities.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize Configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

This project uses **npm** exclusively (see `package-lock.json`). Do not use `yarn` or `pnpm`.

```sh
npm install

```

### Compile and Hot-Reload for Development

```sh
npm run dev

```

### Type-Check, Compile, and Minify for Production

```sh
npm run build

```

---

## Docker

### Development (Hot Reload)

Runs Vite's dev server inside a container, with the project bind-mounted so file changes on the host are picked up immediately.

```sh
npm run docker:dev        # = docker compose -f docker-compose.dev.yml up --build

```

The app is served at [http://localhost:5173](http://localhost:5173). Editing any file under the project triggers Vite's hot reload inside the container—no rebuild needed.

`npm run docker:dev:logs` follows the container logs, `npm run docker:dev:down` stops it, and `npm run docker:dev -- --reset` recreates the `node_modules` volume (needed after changing `package.json`). Anything after `--` is forwarded to `docker compose`, e.g., `npm run docker:dev -- exec vue-project npx vitest run src/foo.test.ts`.

1. **`GITHUB_TOKEN`** (classic PAT with `repo` read scope) exported in the shell, or written in `.env` (git-ignored)—Compose forwards it as the `github_token` build secret:
```sh
echo "GITHUB_TOKEN=$(gh auth token)" >> .env   # gh CLI already authenticated
docker compose -f docker-compose.dev.yml up --build

```


2. **SSH agent**—`docker compose build` has **no** `--secret` flag (only `--ssh default`), so either use the token above or build with:
```sh
ssh-add ~/.ssh/id_ed25519
docker compose -f docker-compose.dev.yml build --ssh default
docker compose -f docker-compose.dev.yml up

```



If neither credential is available, the build stops early with these instructions instead of failing inside `npm ci` with `Permission denied (publickey)`.

The equivalent raw `buildx` invocation (no Compose):

```sh
echo $GITHUB_TOKEN > github_token.txt
docker buildx build -f dev.Dockerfile --secret id=github_token,src=github_token.txt -t vue-project-dev .

```

#### App Stuck on Loading Screen (Playwright "Loading Forever")

* **Symptom:** The splash screen (`#loading-bg`) never disappears, `DOMContentLoaded` does not fire, and the browser/Playwright remains in an infinite loading state.
* **Cause:** `main.ts` imports `@core/scss/template/index.scss`, and the Sass compilation never finishes. With the file watcher using *polling* at the default chokidar interval (100ms), it re-`stat`s all watched files on every tick. On Windows bind mounts, this saturates the Node event loop, and each Sass `@use` statement takes ~2.5s. With hundreds of imports, the graph never closes (meaning `app.mount()` never runs).
* **Solution:** The repository is already configured to handle this: `vite.config.ts` uses `interval: 1000` (configurable via `VITE_WATCH_POLL_INTERVAL`) and ignores `dist/docs/.specify/coverage`. Additionally, `docker-compose.dev.yml` enables polling (`VITE_WATCH_USE_POLLING=true`) because host bind-mount `inotify` does not deliver events—without polling, HMR is blind. If you overwrote this in your `.env`, remove that line.
* **How to Confirm:** Vite starts up in ~2s (`npm run docker:dev:logs | head -5`), and the app's SCSS compiles in seconds:
```sh
curl -s -o /dev/null -w '%{time_total}s\n' \
  http://localhost:5173/src/@core/scss/template/index.scss

```


If this exceeds ~30s, the polling interval is set too low.

### Production

Builds the app and serves the static output via Nginx. Same credential requirement as dev: `GITHUB_TOKEN` in the shell/`.env` is forwarded as the `github_token` build secret (or build with `docker compose -f docker-compose.prod.yml build --ssh default`).

```sh
docker compose -f docker-compose.prod.yml up --build

```

The app is served at [http://localhost:8080](http://localhost:8080).

---

## Feature Flags

To disable features without modifying code, use the `VITE_DISABLE_FEATURE_FLAGS` environment variable (a comma-separated list of route names):

```env
VITE_DISABLE_FEATURE_FLAGS="ai-assistant,ai-knowledge,pages-misc-under-maintenance"

```

When disabled, the feature disappears from navigation and search, and direct access via URL is blocked (redirecting to a secure route). If the variable is empty or omitted, **all** features are enabled.

### How to Configure (Step-by-Step)

1. Open the document file for your desired language, e.g., `src/assets/legal/privacy.pt.html`.
2. Replace the content with your final text (current sections are placeholders/examples).
3. Save—the dev server reloads instantly via HMR.
4. Repeat for other languages. Languages without a file fall back to `en`.

> **Mandatory Naming Convention:** `{document}.{language}.html`—`privacy` or `terms`, followed by `.en | .pt | .fr | .ar | .de`. Arabic requires `dir="rtl"` on the root `

` of the file.

### Security (Sanitization)

HTML is rendered via `v-html`, but passes through **DOMPurify** first (`src/components/dialogs/LegalDocumentsDialog.vue`): scripts, event handlers (`onerror`, `onclick`, etc.), and `javascript:` URLs are automatically removed, even if a file is edited incorrectly. Still, the content is **yours**—do not paste unreviewed third-party HTML.

### Adding a New Document (e.g., Cookies)

1. Create `src/assets/legal/cookies.en.html` (along with versions for other languages).
2. In `LegalDocumentsDialog.vue`, add the corresponding tab (the `import.meta.glob` call automatically loads new files).

---

## 📚 Documentation

Complete documentation is available in the [`/docs`](https://www.google.com/search?q=docs/) folder:

* **[Main Documentation Index](https://www.google.com/search?q=docs/README.md)**: Start here for navigation.
* **[Features](https://www.google.com/search?q=docs/features/)**: Feature-specific documentation.
* **[Implementation Guides](https://www.google.com/search?q=docs/implementation/)**: Step-by-step implementation guides.
* **[Integration Guides](https://www.google.com/search?q=docs/integrations/)**: System integration documentation.
* **[Feature Flags](https://www.google.com/search?q=docs/feature-flags.md)**: Feature flag system documentation.

### Key Features Implemented

* ✅ **ChatGPT-like Interface**: Complete chat experience with navigation and a thread pane.
* ✅ **Mobile Responsive**: Optimized for all screen sizes.
* ✅ **Modular Architecture**: Clean separation of concerns with Vue 3 and TypeScript.

---

## 🏗️ Architecture

Built with modern web technologies:

* **Vue 3** + **TypeScript** + **Composition API**
* **Vuetify 3** for UI components
* **Pinia** for state management
* **Vue Router** with short URL support
* **MSW** for API mocking during development

---

## 🤝 Contributing

1. Check the [`/docs`](https://www.google.com/search?q=docs/) folder for implementation guides.
2. Follow the established patterns in existing components.
3. Add appropriate tests and documentation.
4. Ensure i18n support for new features.

---

## 📄 License

This project is licensed under the MIT License.