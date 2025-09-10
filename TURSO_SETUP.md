# Turso Database Setup

## 1. Install Turso CLI
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

## 2. Sign up and authenticate
```bash
turso auth signup  # or 'turso auth login' if you have an account
```

## 3. Create your database
```bash
turso db create wordle-squad
```

## 4. Create an auth token
```bash
turso db tokens create wordle-squad
```

## 5. Get your database URL
```bash
turso db show wordle-squad --url
```

## 6. Add to Vercel Environment Variables
In your Vercel dashboard, go to Settings → Environment Variables and add:

- `TURSO_DATABASE_URL` = (the URL from step 5)
- `TURSO_AUTH_TOKEN` = (the token from step 4)

## 7. Redeploy
Your next deployment will automatically use the Turso database!

## Database Schema
The API will automatically create this table:
```sql
CREATE TABLE wordle_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player TEXT UNIQUE NOT NULL,
  score INTEGER DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Benefits of Turso
- ✅ **Real SQLite** - familiar SQL syntax
- ✅ **Serverless** - scales to zero
- ✅ **Edge replicas** - fast worldwide
- ✅ **Free tier** - 500 databases, 1M row reads/month
- ✅ **Persistent** - data never gets lost
