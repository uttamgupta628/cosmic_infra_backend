# Cosmic Infra — Backend API

Node.js / Express / MongoDB (Mongoose) API powering the Cosmic Infra admin dashboard,
plus the public form endpoints used by the marketing site (site visit, enquiry / "Let Us
Call You" popup, redevelopment application).

## Setup

```bash
npm install
cp .env.example .env   # then fill in MONGO_URI and JWT_SECRET
npm run seed:admin     # creates the first admin login (see console output for credentials)
npm run dev            # starts on http://localhost:5000
```

## Auth

`POST /api/auth/login` with `{ email, password }` returns a JWT. Send it as
`Authorization: Bearer <token>` on every admin-only route below.

## Public endpoints (used by the website, no auth required)

- `GET  /api/projects?publicOnly=true` — published projects for the Projects page
- `GET  /api/projects/:idOrSlug` — single project detail page
- `POST /api/enquiries` — general enquiry / "Let Us Call You" popup form
- `POST /api/site-visits` — "Book a Site Visit" form
- `POST /api/redevelopment` — "Apply for Redevelopment" form

## Admin endpoints (JWT required)

- `GET/POST/PUT/DELETE /api/projects` — manage projects
- `GET  /api/projects/stats` — counts by status
- `GET/PUT/DELETE /api/enquiries` — manage enquiries
- `GET/PUT/DELETE /api/site-visits` — manage site visit requests
- `GET/PUT/DELETE /api/redevelopment` — manage redevelopment applications
- `GET  /api/dashboard/summary` — powers the dashboard overview cards + recent activity
- `GET  /api/auth/me`, `PUT /api/auth/change-password`

## Image & video storage

Property photos and videos are uploaded to **Cloudinary**, not stored on the server's
own disk (important on hosts like Render, where the local filesystem is wiped on every
redeploy). Sign up at cloudinary.com (free tier is plenty to start), grab the Cloud
Name / API Key / API Secret from your dashboard, and set them in `.env`.

- `POST /api/uploads` (JWT required, `multipart/form-data`, field name `file`) — uploads
  one image or video, returns `{ url, publicId, resourceType }`. Save `url` onto the
  project's `coverImage` or `brochureUrl`.
- `POST /api/uploads/multiple` (same auth, field name `files`, up to 10) — for the
  gallery; returns an array of the same shape. Save the `url`s into the project's
  `gallery` array.
- `DELETE /api/uploads/:publicId` — removes a file from Cloudinary (URL-encode the
  `publicId`, e.g. `cosmic-infra%2Fprojects%2Fabc123`).

`Project.coverImage`, `Project.gallery` and `Project.brochureUrl` stay simple URL
strings either way — whatever URL you save there is what the public site will render.

## Notes

- CORS is restricted to `CLIENT_ORIGIN` in `.env` (comma-separated list for multiple origins).
