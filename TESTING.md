# Testing Documentation

This project maintains a testing suite for the **Orchestrator Server** to ensure API reliability and correctness. The tests are built using **Jest** and **Supertest**.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Running Tests Locally](#running-tests-locally)
- [Test Structure](#test-structure)
- [Mocking Strategy](#mocking-strategy)
- [CI/CD Pipeline](#cicd-pipeline)

## Prerequisites

Ensure you have the development dependencies installed in the `server` directory:

```bash
cd server
npm install
```

This will install:
- `jest`: The testing framework.
- `supertest`: For HTTP assertions.
- `cross-env`: For cross-platform environment variable setting.

## Running Tests Locally

To run the backend tests:

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Run the test script:
   ```bash
   npm test
   ```

   or directly:
   ```bash
   npm run test
   ```

   This command sets `NODE_ENV=test` and runs Jest.

## Test Structure

Tests are located in `server/tests/`.

- **`server.test.js`**: Contains integration tests for the Express API endpoints.
  - `GET /problems`: Verifies that the problem list is returned correctly.
  - `GET /workers/count`: Verifies the worker count endpoint.

## Mocking Strategy

The tests run in isolation without connecting to a real PostgreSQL database or external worker nodes.

- **PostgreSQL (`pg`)**: The `Pool` class is mocked to simulate database queries.
  - `mockQuery`: Intercepts SQL queries and returns predefined rows (e.g., a mock problem list).
  - `mockConnect`: Simulates acquiring a client from the pool.

- **Axios**: Mocked to prevent actual HTTP requests to worker nodes or external services (like Google OAuth) during testing.

## CI/CD Pipeline

We use **GitHub Actions** for Continuous Integration.

- **Workflow File**: `.github/workflows/main.yml`
- **Trigger**: Pushes and Pull Requests to the `main` branch.
- **Jobs**:
  - `test-server`:
    - Sets up Node.js 18.x.
    - Installs server dependencies.
    - Runs `npm test` to verify the build.

This ensures that every change is verified against the test suite before being merged.
