# Job queue

Shared BullMQ transport contract for the API producer and worker consumer. PostgreSQL remains the authoritative lifecycle store. The package defines the stable queue/job names, typed payload, Redis connection settings, bounded retry policy, and retention limits.

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build job-queue` to build the library.

## Running unit tests

Run `nx test job-queue` to execute the unit tests via [Jest](https://jestjs.io).
