# Build runner

Runs allowlisted validation commands in disposable, unprivileged Docker containers. The runner denies networking, uses a read-only root filesystem, drops Linux capabilities, applies CPU/memory/PID/time limits, captures bounded diagnostics, and never mounts the Docker socket or a home directory.

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build build-runner` to build the library.

## Running unit tests

Run `nx test build-runner` to execute the unit tests via [Jest](https://jestjs.io).
