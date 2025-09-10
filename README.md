# 🟨 Wordle Squad Tracker 🟩

A sleek, dark-themed score tracking website for Raehan, Omar, and Mahir's Wordle battles!

## ✨ Features

- **🌙 Dark Theme** - Easy on the eyes
- **🔐 Password Protected** - Secure score updates
- **🏆 Live Leaderboard** - Real-time rankings
- **📱 Mobile Friendly** - Works on all devices
- **☁️ Cloud Sync** - Scores sync across all devices
- **🔄 Auto-Refresh** - Updates every 30 seconds
- **💾 Offline Support** - Works even when offline

## 🚀 Deployment Instructions

### Prerequisites

1. [Node.js](https://nodejs.org/) installed
2. [Vercel account](https://vercel.com/) (free)
3. [GitHub account](https://github.com/) (free)

### Step 1: Setup Vercel Blob Storage

1. In your **Vercel Dashboard**, go to your project
2. Click **"Storage"** tab → **"Create Database"** → **"Blob"**
3. Name it `wordle-blob` and click **"Create"**
4. Done! Vercel automatically connects it.

See `BLOB_SETUP.md` for more details.

### Step 2: Deploy to Vercel

#### Option A: Deploy via GitHub (Recommended)

1. Push this code to a GitHub repository
2. Connect your GitHub repo to Vercel
3. Add environment variables in Vercel dashboard:
   - Connect your KV database (Vercel will do this automatically)
4. Deploy! 🚀

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Install dependencies
npm install

# Deploy
vercel

# Follow the prompts to:
# - Connect to your Vercel account
# - Link to your KV database
# - Deploy to production
```

### Step 3: Access Your Site

Your site will be available at: `https://your-project-name.vercel.app`

## 🔧 Configuration

### Change Password

Edit the password in two places:

1. `/api/scores.js` - Line with `password !== 'wordle123'`
2. `/script.js` - CONFIG object `password: 'wordle123'`

### Add/Remove Players

Edit the `players` array in `/script.js` CONFIG object and update the HTML accordingly.

## 📱 How to Use

1. Visit your deployed website
2. Click "⚙️ Update Scores"
3. Enter password: `wordle123` (or your custom password)
4. Use +1/-1 buttons to update scores
5. Controls auto-lock after 2 minutes for security

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server
vercel dev

# Visit http://localhost:3000
```

## 🔄 API Endpoints

- `GET /api/scores` - Get all scores
- `POST /api/scores` - Update a player's score
- `POST /api/auth` - Verify password

## 🎨 Customization

### Colors

Edit `/styles.css` to change the color scheme. Current theme uses:

- Background: Dark slate gradients
- Accents: Teal and emerald
- Cards: Semi-transparent dark blue

### Features to Add Later

- Game history tracking
- Statistics (win streaks, averages)
- Player profiles with avatars
- Daily/weekly/monthly views
- Export data functionality

## 📊 Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Vercel KV (Redis)
- **Hosting**: Vercel
- **Cost**: FREE (within limits)

## 🆘 Troubleshooting

### Scores not updating?

- Check if KV database is connected
- Verify API endpoints are working
- Check browser console for errors

### Offline mode?

- Scores are cached locally
- Will sync when connection is restored

### Password not working?

- Make sure password matches in both files
- Check browser console for API errors

## 🎉 That's it!

Your Wordle Squad Tracker is ready to track those epic battles! 🏆

---

Made with ❤️ for Raehan, Omar & Mahir
