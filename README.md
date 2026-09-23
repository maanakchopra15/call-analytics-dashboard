# Call Analytics Platform — Week 3

Full-stack CDR analytics platform built for the Week 3 internship assignment.

## Stack
- React + Vite + TypeScript
- Vercel serverless API
- JWT authentication
- bcrypt password hashing
- MockAPI CDR dataset
- Admin and Analyst roles
- Pagination and filters

## Demo accounts
Admin: admin / Admin123!
Analyst: analyst / Analyst123!

## Vercel
Import this GitHub repository into Vercel and deploy with the default Vite settings. No separate backend deployment is required because the API is inside /api.

## API
GET /api/health
POST /api/auth/login
POST /api/auth/signup
POST /api/auth/logout
GET /api/auth/me
GET /api/analytics
GET /api/cdr?page=1&limit=15&city=&caller=&receiver=

The CDR endpoint is Admin-only. Analytics are available to Admin and Analyst users.