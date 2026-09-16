# Call Analytics Dashboard

A React dashboard for exploring Call Detail Record (CDR) data. It summarizes call activity, duration, cost, outcomes, and recent call logs.

## Features

- KPI cards for total calls, total call cost, average call duration, successful calls, and failed calls
- Duration insights: longest, shortest, and average call duration
- Cost by city chart and average cost per call
- Calls-per-hour activity chart
- Calls-by-city chart and city breakdown
- Recent call logs with search and filters
- Responsive layout for desktop and mobile screens

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Lucide React

## Data Source

The dashboard retrieves Call Detail Record data from:

`https://69b30b45e224ec066bdb55a0.mockapi.io/api/v1/cdr`

The API provides call details such as caller and receiver numbers, city, duration, cost, status, and start time.

## Getting Started

### Requirements

- Node.js
- npm

### Install dependencies

```bash
npm install
