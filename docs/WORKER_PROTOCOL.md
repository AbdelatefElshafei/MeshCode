# Worker Protocol

The communication between the **Orchestrator** and **Worker Nodes** occurs over raw TCP sockets. This document defines the custom protocol used for task dispatch and result collection.

## Connection

- **Transport**: TCP
- **Direction**: Orchestrator initiates connection to Worker.
- **Persistence**: Short-lived. The connection is established for a single task chunk and closed after the response (or timeout).

## Message Format

Messages are **JSON** objects serialized to strings and delimited by a newline character (`\n`).

### Request (Orchestrator -> Worker)

The orchestrator sends a single JSON object containing the encrypted payload.

```json
{
  "encryptedPayload": "U2FsdGVkX1+...",
  "encryptionType": "AES"
}
\n
```

#### Decrypted Payload Structure
Once the worker decrypts `encryptedPayload`, the underlying JSON structure is:

```json
{
  "userCode": "result = input[0] + input[1];",
  "testCases": [
    {
      "input": [1, 2],
      "expected": 3
    },
    {
      "input": [10, 20],
      "expected": 30
    }
  ]
}
```

### Response (Worker -> Orchestrator)

The worker processes the task and responds with a JSON object containing the results.

```json
{
  "workerId": 4001,
  "results": [
    {
      "passed": true,
      "input": [1, 2],
      "expected": 3,
      "actual": 3,
      "durationMs": 2
    },
    {
      "passed": false,
      "input": [10, 20],
      "expected": 30,
      "actual": 25,
      "durationMs": 1,
      "error": null
    }
  ]
}
\n
```

## Error Handling

If the worker encounters a system-level error (e.g., decryption failure, malformed JSON), it returns:

```json
{
  "error": "Worker failed",
  "message": "Invalid encryption key"
}
\n
```

## Encryption Details

- **Algorithm**: AES-256 (via `crypto-js` or Node `crypto`).
- **Shared Secret**: Configured via `CRYPTO_KEY` (or hardcoded in shared utils for this demo).
- **Purpose**: Prevents man-in-the-middle attacks from viewing code logic or test case data.
