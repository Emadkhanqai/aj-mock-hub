FROM node:22.23.0-bookworm-slim

WORKDIR /opt/template
COPY templates/angular-starter/package.json templates/angular-starter/package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force

COPY docker/angular-builder/entrypoint.sh /usr/local/bin/aj-build
RUN groupadd --gid 10001 builder \
    && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin builder \
    && chmod 0555 /usr/local/bin/aj-build

ENV PATH="/opt/template/node_modules/.bin:${PATH}"
USER 10001:10001
WORKDIR /workspace
ENTRYPOINT ["/usr/local/bin/aj-build"]
