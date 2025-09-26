# Railway Environment Variables Setup

To fix the "Missing Supabase configuration" error when deploying to Railway, you need to set the following environment variables in your Railway project:

## Required Environment Variables

Set these in your Railway project dashboard under the "Variables" tab:

```
SUPABASE_URL=https://fqbcstojqmcrbocugazz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYmNzdG9qcW1jcmJvY3VnYXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNTI2NDQsImV4cCI6MjA3MzcyODY0NH0.EJvji8qnCLVXtww_tO0J1SFL44KSQs4Y6zI7VrZb2a4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYmNzdG9qcW1jcmJvY3VnYXp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODE1MjY0NCwiZXhwIjoyMDczNzI4NjQ0fQ.t1kK2vyiMhAud7quMNJeZM60iKBgLTLqTKthMXMGi4A
DATABASE_URL=postgresql://postgres:!ILove2eatApple2@db.fqbcstojqmcrbocugazz.supabase.co:5432/postgres
JWT_SECRET=CtOKWc6RokJkUfhUZXWUBZq40scmnaUqIvkVcIWcXWpf5AOB4/j5CZOC4bDtDd8CuFkzinwr6lUS33tiujsBUQ==
ENCRYPTION_KEY=12345678901234567890123456789012
ACH_IMMEDIATE_ORIGIN=1234567890
ACH_IMMEDIATE_DESTINATION=9876543210
ACH_COMPANY_NAME=ACH Company
ACH_COMPANY_ID=1234567890
ACH_ORIGINATING_DFI=1234567890
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
```

## How to Set Environment Variables in Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Variables" tab
4. Add each environment variable listed above
5. Make sure to set `NODE_ENV=production` (this is important!)
6. Redeploy your application

## What Was Fixed

The issue was that the application was trying to load environment variables from a local `config.env` file even in production. I've updated the code to:

1. Only load from `config.env` in development (when `NODE_ENV !== 'production'`)
2. In production, rely on system environment variables
3. Added better error logging to help debug missing environment variables

## Node.js Version Warning

You're also getting a warning about Node.js 18 being deprecated. Consider upgrading to Node.js 20+ in your Railway deployment settings for better compatibility with Supabase.
