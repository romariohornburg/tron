# Tron - Internal Developer Platform

[![Tests](https://github.com/grid-labs-tech/tron/actions/workflows/tests.yml/badge.svg)](https://github.com/grid-labs-tech/tron/actions/workflows/tests.yml)
[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/grid-labs-tech)](https://artifacthub.io/packages/helm/grid-labs-tech/tron)

An Internal Developer Platform that simplifies application delivery on Kubernetes by providing a clean abstraction for workloads, networking, scaling, and exposure.

## Screenshots

| Dashboard | Applications |
|-----------|--------------|
| ![Dashboard](images/dashboard.jpg) | ![Applications](images/applications.jpg) |

| Templates | Instance Details |
|-----------|------------------|
| ![Templates](images/templates.jpg) | ![Instance](images/instance.jpg) |

## Features

- **Cluster Management**: Add and manage multiple Kubernetes clusters
- **Environments**: Organize resources by environments (dev, staging, production)
- **Applications**: Deploy and manage applications with multiple instances
- **Templates**: Reusable Kubernetes templates with Jinja2 templating
- **Gateway API**: Native support for Gateway API routing
- **User Management**: Flexible group-based permission system with organization, environment, and application scopes
- **API Tokens**: User-scoped tokens that inherit permissions from the creating user

## Quick Start

### Option 1: Docker Compose (Recommended)

The fastest way to deploy Tron in production:

```bash
cd docker

# Create environment file
cp .env.example .env

# Edit .env with your settings:
# - DB_PASSWORD: Strong database password
# - SECRET_KEY: API secret key (min 32 chars)
# - DOMAIN: Your domain (for SSL)
# - CERTBOT_EMAIL: Email for Let's Encrypt

# Start all services
docker compose -f docker-compose.prod.yaml --profile full up -d
```

**Access the platform:**
- Portal: `http://localhost` (or `https://your-domain.com` with SSL)
- API Docs: `http://localhost/api/docs`

For HTTPS with Let's Encrypt:
```bash
docker compose -f docker-compose.prod.yaml --profile full --profile ssl up -d
```

See [docker/README.md](docker/README.md) for detailed configuration options.

### Option 2: Helm Chart

For Kubernetes deployments, use our Helm chart:

```bash
helm repo add grid-labs-tech https://grid-labs-tech.github.io/charts
helm repo update
helm install tron grid-labs-tech/tron
```

See the [Helm Chart documentation](https://github.com/grid-labs-tech/charts/tree/main/tron) for configuration options.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Portal                           │
│                    (React Frontend)                     │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                         API                             │
│                  (FastAPI Backend)                      │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                     PostgreSQL                          │
└─────────────────────────────────────────────────────────┘
```

### Core Concepts

**Application** → **Instance** → **Component**

- **Application**: A software project (e.g., `my-api`)
- **Instance**: Deployment in a specific environment (e.g., `my-api` in `production`)
- **Component**: Functional part of an instance (`webapp`, `worker`, or `cron`)

```
Application: my-api
├── Instance: dev
│   ├── api-server (webapp)
│   └── email-worker (worker)
└── Instance: production
    ├── api-server (webapp)
    ├── email-worker (worker)
    └── daily-report (cron)
```

## Authentication

Tron supports two authentication methods:

| Method | Use Case | Header |
|--------|----------|--------|
| JWT | Web Portal | `Authorization: Bearer <token>` |
| API Token | Programmatic access | `x-tron-token: <token>` |

### API Tokens

API tokens are **user-scoped tokens** that inherit the same permissions as the user who created them. When you create an API token, it is associated with your user account and automatically inherits all your group memberships and roles across all organizations you belong to.

**Key characteristics:**
- Tokens are created by users and linked to their account
- Tokens inherit all permissions from the creating user (organization, environment, and application scopes)
- Tokens can be revoked or deactivated independently
- Tokens can have optional expiration dates
- Tokens without an associated user are denied access

**Use cases:**
- CI/CD pipelines that need to deploy applications
- Automation scripts that manage resources
- Third-party integrations that require API access
- Service accounts for specific operations

## Permission Model

Tron uses a flexible group-based permission system with three levels of scope: **Organization**, **Environment**, and **Application**. Users are assigned to groups that grant specific roles at each scope level.

### Scopes and Roles

#### Organization Scope

Groups that apply to the entire organization:

- **ORG_OWNER**: Full administrative access to the entire organization
- **ORG_ADMIN**: Can manage all applications and organization access permissions
- **ORG_MEMBER**: Can create, delete, and edit all applications in the organization

#### Environment Scope

Groups that apply to a specific environment:

- **ENV_MAINTAINER**: Can manage all components and instances within the environment
- **ENV_OPERATOR**: Can edit existing components but cannot create or delete instances
- **ENV_VIEWER**: Read-only access to all resources within the environment scope

#### Application Scope

Groups that apply to a specific application:

- **APP_MAINTAINER**: Full access to manage all aspects of a specific application
- **APP_DEVELOPER**: Can edit and modify components within a specific application
- **APP_VIEWER**: Read-only access to view resources within a specific application

### Permission Matrix Examples

**Instance Operations:**
- **Create Instance**: Requires `ORG_MEMBER` or `ENV_MAINTAINER` (for that environment)
- **Update Instance**: Requires `ORG_MEMBER`, `ENV_OPERATOR`, or `ENV_MAINTAINER` (for that environment)
- **Delete Instance**: Requires `ORG_MEMBER` (only)
- **View Instance**: Requires `ORG_MEMBER` or any environment role (`ENV_VIEWER`, `ENV_OPERATOR`, `ENV_MAINTAINER`)

**Multi-Tenant Isolation:**
- Users can only access resources from organizations they belong to
- Cross-organization access is strictly forbidden (returns 403 Forbidden)
- Each organization's resources are completely isolated from others

## API Documentation

Interactive API documentation is available at:
- **Swagger UI**: `/api/docs`
- **ReDoc**: `/api/redoc`

## Development

For local development setup, see [DEVELOPMENT.md](DEVELOPMENT.md).

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Contributors

<a href="https://github.com/grid-labs-tech/tron/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=grid-labs-tech/tron" alt="Contributors" />
</a>

## License

This project is licensed under the [Apache License 2.0](LICENSE).

---

**Built with ❤️ to simplify Kubernetes application management**
