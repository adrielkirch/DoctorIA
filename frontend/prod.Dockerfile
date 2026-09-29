# Use the official Node.js image as the base image
FROM node:lts as builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package.json package-lock.json ./

# rp-doctoria-utils is a private GitHub repo and host `npm i` is not used, so the image
# build itself must authenticate. Two supported paths:
#   1. GITHUB_TOKEN (classic PAT with `repo` read) in the shell env or in `.env` ->
#      forwarded by Compose as the `github_token` build secret below.   <- default
#   2. BuildKit SSH agent: `docker compose ... build --ssh default`.
# NOTE: `docker compose build` has NO `--secret` flag (only `--ssh`); the token always
# comes from the environment. Keep this block in sync with dev.Dockerfile.
RUN --mount=type=ssh,required=false \
  --mount=type=secret,id=github_token,required=false \
  set -eu \
  && mkdir -p -m 0700 ~/.ssh \
  && (ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null || true) \
  && if [ -s /run/secrets/github_token ]; then \
  TOKEN="$(cat /run/secrets/github_token)"; \
  git config --global --add url."https://x-access-token:${TOKEN}@github.com/".insteadOf "ssh://git@github.com/"; \
  git config --global --add url."https://x-access-token:${TOKEN}@github.com/".insteadOf "git@github.com:"; \
  fi \
  && if ! git ls-remote --exit-code ssh://git@github.com/adrielkirch/rp-doctoria-utils.git v0.3.0 >/dev/null 2>&1; then \
  printf '  Cannot read the private dependency adrielkirch/rp-doctoria-utils (auth failed).\n\n  The build needs a GitHub token with the "repo" scope. Fastest ways:\n\n    echo "GITHUB_TOKEN=$(gh auth token)" >> .env   # or export it in the shell\n    docker compose -f docker-compose.prod.yml up --build\n\n  Or use an SSH agent instead:\n    ssh-add ~/.ssh/id_ed25519\n    docker compose -f docker-compose.prod.yml build --ssh default\n\n' >&2; exit 1; \
  fi \
  && npm ci --ignore-scripts

# Copy the rest of the application code
COPY . .

# postinstall (icon build, msw init) needs the full source, so run it now that it's copied.
RUN npm run postinstall

RUN npm run build

# Use Nginx as the production server
FROM nginx:stable-alpine

# Copy the custom Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built Vue.js files to the Nginx web server directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 for Nginx
EXPOSE 80

# Start Nginx when the container runs
CMD ["nginx", "-g", "daemon off;"]
