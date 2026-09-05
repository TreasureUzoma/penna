# Project Penna Backend

This project serves as the robust backend for a platform designed to manage projects, user subscriptions, and email campaigns. It provides a comprehensive set of APIs for user authentication, project administration, role-based access control, secure API key management, and the creation/delivery of email newsletters.

## Features

- **User Authentication & Authorization**:
  - Standard email/password login and signup.
  - OAuth integration with Google and GitHub.
  - Secure JWT-based access and refresh token management with signed cookies.
  - Password reset functionality via email.
- **Project Management**:
  - Create, update, and delete projects.
  - Invite users to projects with specific roles.
  - Accept/decline project invitations.
  - Update project member roles.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for project members (Owner, Admin, Editor, Viewer).
- **Secure API Key Management**:
  - Generate public and private API keys for project integration.
  - Private keys are securely encrypted using SubtleCrypto.
  - API keys are used for external service authentication.
- **Subscription Management**:
  - Add and remove subscribers for projects.
  - Handle unsubscribe requests with email confirmation.
  - Paginated retrieval of project subscribers.
- **Email Campaign / Post Management**:
  - Create email drafts for newsletters.
  - Update and publish email posts, triggering newsletter delivery.
  - Retrieve all posts associated with a user's projects.
- **API Rate Limiting**: Protects endpoints from abuse using Redis.
- **Health Checks**: Basic `/health` endpoint for monitoring.
- **Global Error Handling**: Centralized error management for API responses.

## Stacks / Technologies

| Technology         | Description                                                                    | Link                                                                                                                               |
| :----------------- | :----------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| **Bun**            | Fast JavaScript runtime and toolkit.                                           | [https://bun.sh/](https://bun.sh/)                                                                                                 |
| **Hono**           | Ultrafast, lightweight web framework for the edge.                             | [https://hono.dev/](https://hono.dev/)                                                                                             |
| **Drizzle ORM**    | TypeScript ORM for SQL databases.                                              | [https://orm.drizzle.team/](https://orm.drizzle.team/)                                                                             |
| **PostgreSQL**     | Powerful, open-source object-relational database system.                       | [https://www.postgresql.org/](https://www.postgresql.org/)                                                                         |
| **Redis**          | In-memory data store, used for rate limiting and potentially session caching.  | [https://redis.io/](https://redis.io/)                                                                                             |
| **Zod**            | TypeScript-first schema declaration and validation library.                    | [https://zod.dev/](https://zod.dev/)                                                                                               |
| **hono-jwt**       | JWT middleware for Hono.                                                       | [https://github.com/honojs/hono/tree/main/src/middleware/jwt](https://github.com/honojs/hono/tree/main/src/middleware/jwt)         |
| **googleapis**     | Google API client library for Node.js (used for Google OAuth).                 | [https://github.com/googleapis/google-api-nodejs-client](https://github.com/googleapis/google-api-nodejs-client)                   |
| **Web Crypto API** | Browser-native API for cryptographic operations (used for API key encryption). | [https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) |
| **TypeScript**     | Strongly typed superset of JavaScript.                                         | [https://www.typescriptlang.org/](https://www.typescriptlang.org/)                                                                 |

## Installation

To get this project up and running locally, follow these steps:

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/treasureuzoma/penna
    pnpm dev
    ```

2.  **Install dependencies**:

    ```bash
    pnpm install
    ```

3.  **Set up environment variables**:
    Create a `.env` file in the root directory based on `config.ts` and fill in the necessary values.

    ```
    # Example .env content
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    GITHUB_CLIENT_ID=your_github_client_id
    GITHUB_CLIENT_SECRET=your_github_client_secret
    APP_URL=http://localhost:3005 # Your server's URL
    JWT_REFRESH_SECRET=a_very_secret_refresh_key
    JWT_ACCESS_SECRET=a_very_secret_access_key
    NODE_ENV=development
    REDIS_URL=redis://localhost:6379 # Your Redis connection string
    ENCRYPTION_KEY=a_32_byte_hex_string_for_aes_gcm # e.g., bun -e "console.log(crypto.randomBytes(32).toString('hex'))"
    UNSUBSCRIBE_SECRET=a_secret_for_unsubscribe_tokens
    APP_URL=http://localhost:3000 # Your frontend client URL
    # Database connection string (for Drizzle ORM)
    DATABASE_URL="postgresql://user:password@host:port/database"
    ```

    _Make sure `ENCRYPTION_KEY` is a 32-byte (64 hex characters) string for AES-GCM._

4.  **Database Setup**:
    This project uses Drizzle ORM. You'll need a PostgreSQL database.
    - Set your `DATABASE_URL` in the `.env` file.
    - Run Drizzle migrations to set up your database schema:
      ```bash
      bun drizzle-kit push:pg
      ```
    - (Optional) Generate new migrations:
      ```bash
      bun drizzle-kit generate:pg
      ```

5.  **Start the development server**:
    ```bash
    bun run dev
    ```
    The server will start on the port defined in `envConfig.PORT` (default 3005).

## Usage

The backend exposes a RESTful API. Below are some high-level examples of how you might interact with it. Detailed API documentation would typically be provided separately (e.g., Swagger/OpenAPI).

### Authentication

- **Register**: `POST /api/v1/auth/signup` with `{ email, password, name }`
- **Login**: `POST /api/v1/auth/login` with `{ email, password }`
- **Logout**: `POST /api/v1/auth/logout`
- **OAuth (GitHub/Google)**: `POST /api/v1/auth/github/url` or `POST /api/v1/auth/google/url`

### Projects

- **Create Project**: `POST /api/v1/projects/new` with `{ name }`
- **Get User Projects**: `GET /api/v1/projects` (requires authentication)
- **Get Project API Keys**: `GET /api/v1/projects/api/:projectId` (requires authentication with `owner` or `admin` role)

### Subscriptions (Internal API)

- **Add Subscriber**: `POST /api/v1/subscribers` with `{ projectId, email, name? }` (requires project admin/owner)
- **Unsubscribe Request**: `POST /api/v1/unsubscribe` with `{ projectId, email }` (sends a confirmation email)
- **Confirm Unsubscribe**: `GET /api/v1/unsubscribe/:token` (from the confirmation email link)

### External API (for Integrations)

- **Add Subscriber**: `POST /api/v1/external/projects/subscriber/new`
  - Requires `x-penna-public-key` header.
  - Optionally `x-penna-private-key` for private key authenticated actions.
  - Body: `{ email, name? }`

## Contributing

Contributions are welcome! Please follow these steps:

See root

[![Readme was generated by Readmit](https://img.shields.io/badge/Readme%20was%20generated%20by-Readmit-brightred)](https://readmit.vercel.app)
