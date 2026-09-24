# Call Analytics Platform — Week 3

Full-stack CDR analytics platform built for the Week 3 internship assignment.

## Stack
- React + Vite + TypeScript
- Vercel serverless API
- JWT authentication
- bcrypt password hashing
- Assignment CDR dataset extracted from the supplied mock_call_records_10000.xlsx PDF
- Admin and Analyst roles
- Backend pagination
- City, caller and receiver filters
- Date-range filtering in the backend

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
GET /api/cdr?page=1&limit=15&city=&caller=&receiver=&from=&to=

The CDR endpoint is Admin-only. Analytics are available to Admin and Analyst users.

The current deployed repository contains the first 500 records extracted from the supplied 10,000-record assignment PDF as a bundled serverless dataset.