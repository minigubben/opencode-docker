FROM node:20-bookworm-slim

ARG OPENCODE_NPM_PACKAGE=opencode-ai
ARG OPENCODE_NPM_VERSION=latest

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    openssh-client \
    vim \
    curl \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g "${OPENCODE_NPM_PACKAGE}@${OPENCODE_NPM_VERSION}" \
  && opencode --version

WORKDIR /home/node/allowed

ENTRYPOINT ["opencode"]
CMD ["--help"]
