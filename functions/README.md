# Cloudflare Functions Environment Setup

## Local Development Setup

1. Create `.env` file in the `functions` directory:
```bash
# functions/.env
DAILY_API_KEY=your_daily_api_key_here
```

2. Install dependencies:
```bash
cd functions
npm install
```

## Cloudflare Environment Variables Setup

Set up environment variables in Cloudflare Pages:

### Environment Variables
- `DAILY_API_KEY` - Your Daily.co API key (Secret)

### Production Setup
```bash
# Set Daily API key as secret
wrangler pages secret put DAILY_API_KEY --project-name your-project-name

# Or via Cloudflare Dashboard:
# Go to Pages > Your Project > Settings > Environment Variables
# Add DAILY_API_KEY as encrypted variable
```

## API Endpoints

After deployment, your functions will be available at:
- `https://your-domain.pages.dev/api/daily-room`
- `https://your-domain.pages.dev/api/daily-token`

## Local Testing

```bash
npx wrangler pages dev dist --compatibility-date=2024-01-01
```