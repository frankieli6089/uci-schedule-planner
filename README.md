# UCI Schedule Planner

A web app that helps UC Irvine students search for courses, pick sections, and see their weekly schedule on a calendar, with automatic conflict detection.

Planning tool only. It is not a replacement for UCI WebReg.

## Features

- Search courses by department and course number using live UCI WebSOC data
- Browse lectures, discussions, and labs for each course
- Select sections and add them to "My Schedule"
- Conflict warnings when two sections overlap
- Monday-Friday weekly calendar with color-coded courses

## Tech Stack

- Next.js, React, TypeScript
- Tailwind CSS
- [`websoc-api`](https://github.com/icssc/websoc-api) for UCI Schedule of Classes data

## Getting Started

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Roadmap

- Search by course name
- Term selector
- Saved schedules and user accounts (PostgreSQL)