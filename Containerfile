FROM docker.io/library/node:22-bookworm
RUN npm i -g @anthropic-ai/claude-code
RUN apt-get update && apt-get install -y git zip && rm -rf /var/lib/apt/lists/*
# Playwright: Chromium i Firefox + biblioteki systemowe (--with-deps wymaga roota, więc przed USER node).
# Wspólna ścieżka, żeby przeglądarki widział użytkownik node. Wersja = @playwright/test w package.json.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx -y playwright@1.65.1 install --with-deps chromium firefox && rm -rf /var/lib/apt/lists/* && chmod -R a+rX /ms-playwright
USER node
WORKDIR /work
# Port dla `npx serve www -l 3000`. EXPOSE nie publikuje portu – uruchamiaj z: podman run -p 3000:3000 ...
EXPOSE 3000
