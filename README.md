# Mobile Dog Salon

Premium mobile dog grooming website for Orange County, inspired by [Barkbus](https://www.barkbus.com/).

## Features

- **Barkbus-style landing page** — hero, reviews, services, benefits, FAQ, locations, and CTAs
- **Multi-step booking form** — pet info, service selection, scheduling, and contact details
- **Orange & white branding** with blue accent highlights
- **Orange County focus** — city list and localized content
- **Booking fallback** — links to external calendar at [tpmr.com/i/99105](https://tpmr.com/i/99105)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Booking

- Click **Book an Appointment** anywhere on the site to open the multi-step form modal
- Or visit `/book` for the full-page booking experience
- Submissions are logged via `/api/book` — connect your email service or CRM there

## Customize

- **Phone number**: Edit `lib/constants.ts`
- **Booking URL**: Edit `BOOKING_URL` in `lib/constants.ts`
- **Cities, services, FAQ**: Edit `lib/constants.ts`

## Deploy

```bash
npm run build
npm start
```

Works with Vercel, Netlify, or any Node.js host.
