FROM node:20-bookworm-slim

ARG OPENCODE_NPM_PACKAGE=opencode-ai
ARG OPENCODE_NPM_VERSION=latest
ARG OPENCODE_EXTRA_NPM_PACKAGES=
ARG OPENCODE_EXTRA_APT_PACKAGES=

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    openssh-client \
    vim \
    curl \
    ${OPENCODE_EXTRA_APT_PACKAGES} \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g "${OPENCODE_NPM_PACKAGE}@${OPENCODE_NPM_VERSION}" ${OPENCODE_EXTRA_NPM_PACKAGES} \
  && opencode --version

WORKDIR /home/node/allowed

ENTRYPOINT ["opencode"]
CMD ["--help"]
