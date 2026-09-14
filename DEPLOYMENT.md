# Production deployment

This repository is ready to run as six independently deployable services:

| Service    | Suggested hostname                  | Container port |
| ---------- | ----------------------------------- | -------------- |
| Website    | `superblackcoffee.co.th`            | 5175           |
| Admin      | `admin.superblackcoffee.co.th`      | 8080           |
| Franchise  | `franchise.superblackcoffee.co.th`  | 8080           |
| Attendance | `attendance.superblackcoffee.co.th` | 8080           |
| Stock      | `stock.superblackcoffee.co.th`      | 8080           |
| API        | `api.superblackcoffee.co.th`        | 8080           |

## Required cloud services

- Managed PostgreSQL with automated backups and TLS required.
- Managed Redis with TLS required.
- A reverse proxy or cloud load balancer that terminates HTTPS and routes each hostname to its service.
- A secret store for runtime secrets. Do not upload a production `.env` file to Git.

## Configuration

Copy `.env.production.example` to a secure location outside the repository, replace every placeholder, and store the secret values in the cloud provider.

`VITE_API_URL` and `NEXT_PUBLIC_*` values are build-time values. Rebuild the corresponding frontend image whenever a public URL changes. `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and `CORS_ORIGINS` are API runtime secrets.

Set `CORS_ORIGINS` to every HTTPS frontend origin exactly, separated by commas. The API refuses to start in production without `JWT_SECRET` and `CORS_ORIGINS`.

## Deployment order

1. Create the database backup policy, Redis instance, DNS records, and HTTPS certificates.
2. Configure the environment variables and secrets in the cloud provider.
3. Build and deploy the API first. Confirm `GET /health` returns `200`.
4. Deploy each frontend with its public API build argument.
5. Route the domains through the reverse proxy/load balancer.
6. Verify login, cookie-based sessions, PDF download, a write operation, and the public website lead form.

For a single-VM deployment, the production service definitions are in `docker-compose.production.yml`:

```sh
docker compose --env-file /secure/path/superblackcoffee.production.env -f docker-compose.production.yml up -d --build
```

That Compose file deliberately does not create PostgreSQL or Redis. It expects managed services through `DATABASE_URL` and `REDIS_URL`.

## Migration and rollback policy

The API applies its embedded migrations at startup. Before a production release, take a verified database backup and deploy one API instance first so migrations complete before scaling out. Never edit an already-applied migration file because the API validates migration checksums.

To roll back application code, redeploy the prior image only after confirming the new migration is backward compatible. Restoring data requires the managed PostgreSQL backup/restore procedure; it is not an application rollback.

## CI gate

Every push now verifies lint/build for Website, Admin, Franchise, Attendance, Stock, and API, then builds all six production Docker images. A deployment should only use a commit whose CI is green.
