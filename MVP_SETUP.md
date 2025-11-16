# EISE MVP - Setup & Deployment

## Overview

EISE (Enterprise Sales Intelligence Engine) - A minimal B2B sales intelligence platform that extracts stakeholders and risks from meeting notes.

**Core Features:**
- Meeting notes extraction (AI-powered)
- Stakeholder tracking
- Risk identification
- Prep brief generation (template-based)
- Stakeholder relationship mapping

**Cost:** ~€0.10 per user per month for AI extraction

## Prerequisites

- Supabase project
- Lovable AI API key (for Gemini 2.5 Flash)
- Node.js 18+

## Environment Variables

Create `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase Setup

### 1. Run Migrations

```bash
# Migrations are in supabase/migrations/
# Apply via Supabase CLI or dashboard
```

### 2. Set Edge Function Secrets

In Supabase Dashboard > Edge Functions > Secrets:

```
LOVABLE_API_KEY=your_lovable_api_key
ALLOWED_ORIGIN=https://your-production-domain.com
```

For development, use `ALLOWED_ORIGIN=*`

### 3. Deploy Edge Functions

```bash
# Deploy extraction function
supabase functions deploy extract-meeting-intelligence

# Verify secrets are set
supabase secrets list
```

## Rate Limits

Configured in `supabase/functions/_shared/rateLimit.ts`:

- Meeting extraction: 10 calls/day per user
- Prep brief generation: 20 calls/day per user

Adjust limits based on your budget.

## Local Development

```bash
npm install
npm run dev
```

## Production Deployment

### Frontend
Deploy to Vercel/Netlify/Lovable:
- Build command: `npm run build`
- Output directory: `dist`
- Set environment variables in deployment platform

### Backend
Edge functions deploy automatically via Supabase CLI or dashboard.

## Security Checklist

- ✅ JWT authentication on all edge functions
- ✅ Row Level Security (RLS) on all tables
- ✅ Rate limiting enabled
- ✅ CORS restricted to production domain
- ⚠️  Set `ALLOWED_ORIGIN` to your production domain (not `*`)

## Database Indexes

Performance indexes are included in migrations:
- `meetings(deal_id)`
- `stakeholders(deal_id)`
- `deals(user_id, status)`
- `meetings(deal_id, meeting_date DESC)`

## Cost Monitoring

**AI Costs (Lovable/Gemini 2.5 Flash):**
- ~250 tokens per extraction
- ~€0.01 per extraction
- 10 users × 10 extractions/month = €1/month

Budget for month 1: €100 = ~10,000 extractions

**Supabase:**
- Free tier covers MVP (up to 500MB database, 2GB bandwidth)

## Troubleshooting

**Extraction failing:**
1. Check Lovable AI credits
2. Verify `LOVABLE_API_KEY` secret is set
3. Check rate limits in database: `user_api_usage` table

**CORS errors:**
1. Set `ALLOWED_ORIGIN` to your frontend domain
2. Redeploy edge functions

**Database slow:**
1. Verify indexes exist (see migration `20251116100000_add_performance_indexes.sql`)
2. Check RLS policies are optimized

## Support

For issues, check:
1. Supabase logs (Edge Functions tab)
2. Browser console
3. Database logs (SQL Editor > Query logs)
