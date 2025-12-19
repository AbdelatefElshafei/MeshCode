# Distribute PS Platform

**A High-Performance Distributed Code Execution Engine**

Distribute PS Platform is a robust, scalable, and secure distributed computing system designed to parallelize code execution across a cluster of isolated worker nodes. Built with a modern microservices architecture, it features a powerful orchestrator that manages task distribution, load balancing, and result aggregation, all while maintaining strict security protocols through payload encryption and sandboxed execution environments.

This platform demonstrates an enterprise-grade approach to distributed systems, combining a high-performance Node.js backend with a sleek, responsive Next.js 16 frontend.

---

##  Key Features

### Core Architecture
- **Distributed Execution Model**: Splits complex computational tasks into smaller chunks and distributes them across a dynamic pool of worker nodes.
- **Secure Communication**: All payloads between the orchestrator and workers are encrypted using **AES-256** (with support for DES), ensuring data integrity and confidentiality in transit.
- **Sandboxed Environments**: Worker nodes execute user code within isolated Node.js `vm` contexts, preventing malicious code from affecting the host system.
- **Scalable Worker Pool**: Designed to scale horizontally. Add as many worker nodes as needed to handle increased load.

### Modern Frontend Experience
- **Next.js 16 & React 19**: Built on the latest React ecosystem for optimal performance and server-side rendering.
- **Interactive Dashboard**: Real-time visualization of task status, worker health, and submission results.
- **Tailwind CSS 4**: A beautiful, fully responsive UI with dark mode support and fluid animations using `framer-motion`.
- **Code Editor Integration**: Embedded Monaco Editor for a premium coding experience.

### Enterprise-Grade Backend
- **Robust Orchestrator**: Handles task splitting, dispatching, timeout management, and result aggregation.
- **PostgreSQL Persistence**: Reliable storage for user profiles, problem definitions, and submission history.
- **Authentication System**: Secure JWT-based authentication with support for Email/Password and Google OAuth.

---

## Tech Stack

### Frontend (`/client`)
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4, Lucide React
- **Editor**: Monaco Editor (`@monaco-editor/react`)
- **State/Animations**: Framer Motion

### Backend Orchestrator (`/server`)
- **Runtime**: Node.js
- **Framework**: Express 5
- **Database**: PostgreSQL (`pg` driver)
- **Security**: `bcryptjs` (hashing), `jsonwebtoken` (auth), `crypto` (payload encryption)
- **Communication**: HTTP/REST for client, TCP for worker nodes

### Worker Nodes (`/worker`)
- **Runtime**: Node.js
- **Communication**: TCP (Net module)
- **Execution**: Node.js `vm` (Virtual Machine) module for sandboxing
- **Encryption**: Shared symmetric crypto utilities

---

##  Quick Start

### 1. Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL Database

### 2. Installation
Install dependencies for all services:

```bash
# Install Server dependencies
cd server && npm install

# Install Worker dependencies
cd ../worker && npm install

# Install Client dependencies
cd ../client && npm install
```

### 3. Configuration
Set up the Orchestrator environment variables:
1. Copy `server/.env.example` to `server/.env`.
2. Update the following variables:

```env
# Database Configuration
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=yourpassword
PGDATABASE=distribute_ps

# Security
JWT_SECRET=your_secure_jwt_secret

# Optional: Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 4. Launch the Platform

**Step A: Start Worker Nodes**
Workers listen on TCP ports. You can start multiple workers to simulate a cluster.

*Windows (using provided script):*
```powershell
cd worker
npm run start
# Launches workers on ports 4001-4004
```

*Manual Start:*
```bash
node worker/index.js 4001
node worker/index.js 4002
# Add more as needed...
```

**Step B: Start Orchestrator**
The orchestrator manages the workers and serves the API.
```bash
cd server
npm run start
# Runs on http://localhost:3001
```

**Step C: Start Frontend**
Launch the user interface.
```bash
cd client
npm run dev
# Accessible at http://localhost:3000
```

---

##  How It Works

1. **Submission**: A user submits a coding task (e.g., "Sum two numbers") via the Next.js dashboard.
2. **Orchestration**: The Orchestrator receives the request, fetches the test cases from PostgreSQL, and splits them into chunks.
3. **Dispatch**: Encrypted payloads containing the user's code and a subset of test cases are sent to available Worker Nodes via TCP.
4. **Execution**:
    - Workers receive the encrypted payload.
    - Decrypt it using the shared secret.
    - Run the code in a secure `vm` sandbox against the test cases.
    - Return the results (pass/fail) to the Orchestrator.
5. **Aggregation**: The Orchestrator collects results from all workers, aggregates them, and saves the final submission status to the database.
6. **Feedback**: The user sees real-time results on the dashboard.

---

##  Testing

The project includes a comprehensive test suite for the Orchestrator.

To run backend tests:
```bash
cd server
npm test
```

See **[TESTING.md](TESTING.md)** for detailed testing documentation and CI/CD pipeline information.

---

##  API Overview

- `GET /workers/count`: Check active worker nodes.
- `POST /submit`: Submit code for execution.
- `POST /auth/register`: Create a new account.
- `POST /auth/login`: Authenticate and receive JWT.
