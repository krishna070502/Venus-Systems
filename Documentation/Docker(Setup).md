# Docker Setup Guide

This document provides instructions on how to set up and run the Venus System using Docker and Docker Compose. This approach ensures a consistent development and deployment environment, eliminating dependency-related issues.

## Prerequisites

Before starting, ensure you have the following installed on your system:

- **Docker**: [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose**: Included with Docker Desktop on macOS and Windows. On Linux, you may need to [install it separately](https://docs.docker.com/compose/install/).

## Architecture Overview

The system is split into two main containerized services:

1.  **Backend (FastAPI)**:
    - Runs on Python 3.11.
    - Exposes port `8000`.
    - Handles API requests, database interactions, and business logic.
2.  **Frontend (Next.js)**:
    - Runs on Node 18.
    - Exposes port `3000`.
    - Provides the user interface and communicates with the Backend.

---

## How to Start the Application

Follow these steps to spin up the entire system:

### 1. Configure Environment Variables

Ensure you have the necessary `.env` files in place. Docker Compose is configured to look for these files:

- **Backend**: `/backend/.env`
- **Frontend**: `/frontend/.env.local`

> [!NOTE]
> Examples are provided in `.env.example` within each directory.

### 2. Build and Start Containers

Open your terminal in the root directory of the project and run:

```bash
docker-compose up --build
```

- `--build`: Forces Docker to rebuild the images (useful if you've changed dependencies or code).
- Use `docker-compose up -d` to run in **detached mode** (in the background).

### 3. Access the System

Once the containers are running, you can access the services at:

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)

---

## Common Commands

| Action | Command |
| :--- | :--- |
| **Start Services** | `docker-compose up` |
| **Stop Services** | `docker-compose down` |
| **Rebuild Images** | `docker-compose build` |
| **View Logs** | `docker-compose logs -f` |
| **View Service Logs** | `docker-compose logs -f [backend/frontend]` |
| **Restart a Service** | `docker-compose restart [service_name]` |
| **Execute Command in Container** | `docker-compose exec [service_name] [command]` |

---

## Troubleshooting

### Dependency Issues
If you add new packages to `package.json` or `requirements.txt`, you must rebuild the containers:
```bash
docker-compose up --build
```

### Port Conflicts
If you get an error saying ports `3000` or `8000` are already in use, ensure no local instances of the app are running outside of Docker.

### Environment Changes
Changes to `.env` files require a restart of the containers to take effect:
```bash
docker-compose restart
```

---

## Production Considerations

For production deployments:
1.  **Environment Variables**: Use secrets management or secure environment injection.
2.  **Database**: While the app can connect to a containerized database, it's currently configured to use external services (like Supabase/Neon). Ensure your network allows the containers to reach these external endpoints.
3.  **Optimization**: The frontend uses a multi-stage build to minimize the final image size.
