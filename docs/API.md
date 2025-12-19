# API Documentation

The Distribute PS Platform Orchestrator exposes a RESTful API for client interactions.

## Base URL
`http://localhost:3001` (default)

## Authentication
Most endpoints require a valid JWT token in the `Authorization` header.
```
Authorization: Bearer <your_token>
```

---

## Endpoints

### 1. Authentication

#### Register
Create a new user account.
- **URL**: `/auth/register`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123"
  }
  ```
- **Response**:
  - `200 OK`: `{ "token": "..." }`
  - `400 Bad Request`: Validation error.

#### Login
Authenticate an existing user.
- **URL**: `/auth/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123"
  }
  ```
- **Response**:
  - `200 OK`: `{ "token": "..." }`
  - `401 Unauthorized`: Invalid credentials.

#### Google OAuth
Initiate Google OAuth flow.
- **URL**: `/auth/google`
- **Method**: `GET`
- **Response**: Redirects to Google Login.

---

### 2. User Management

#### Get Current User
Retrieve profile information for the authenticated user.
- **URL**: `/users/me`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "photo_url": "data:image/..."
    }
  }
  ```

#### Update Profile Photo
Upload a new profile picture (Base64 encoded).
- **URL**: `/users/me/photo`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "dataUrl": "data:image/png;base64,..."
  }
  ```
- **Response**: `{ "photo_url": "..." }`

---

### 3. Dashboard & Problems

#### Get Dashboard Data
Fetches available problems and the user's recent activity.
- **URL**: `/dashboard`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "user": { ... },
    "problems": [
      {
        "id": 1,
        "title": "Summation",
        "description": "...",
        "latest_status": "Accepted"
      }
    ]
  }
  ```

---

### 4. Submission & Execution

#### Submit Code
Submit a solution for distributed execution.
- **URL**: `/submit`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "questionId": 1,
    "userCode": "result = input[0] + input[1];"
  }
  ```
- **Response**:
  ```json
  {
    "status": "Accepted",
    "totalTests": 50,
    "passedTests": 50,
    "workerCount": 4,
    "submissionId": 123,
    "details": [
      {
        "passed": true,
        "input": [1, 2],
        "expected": 3,
        "actual": 3,
        "workerId": 4001
      }
    ]
  }
  ```

#### Get Active Workers
Check how many worker nodes are currently connected and healthy.
- **URL**: `/workers/count`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "count": 4
  }
  ```
