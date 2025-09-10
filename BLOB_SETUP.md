# Vercel Blob Storage Setup

## Super Simple Setup! 🎉

### Step 1: Create Blob Storage in Vercel
1. Go to your **[Vercel Dashboard](https://vercel.com/dashboard)**
2. Click on your **`wordle-squad-tracker`** project
3. Go to the **"Storage"** tab
4. Click **"Create Database"** → **"Blob"**
5. Name it: **`wordle-blob`**
6. Click **"Create"**

### Step 2: That's it! 
Vercel automatically connects the Blob storage to your project with environment variables.

## How It Works
- 📁 **Stores a JSON file** with all your scores
- 🔄 **Persistent** - data survives deployments
- ⚡ **Fast** - CDN-backed storage
- 💰 **Free** - generous free tier

## Data Format
Your scores are stored as a simple JSON file:
```json
{
  "scores": {
    "raehan": 15,
    "omar": 12,
    "mahir": 18
  },
  "lastUpdated": "2025-09-10T15:30:00.000Z"
}
```

## Benefits
- ✅ **No CLI setup needed**
- ✅ **No environment variables to configure**
- ✅ **Automatic connection**
- ✅ **Perfect for simple data**
- ✅ **Built into Vercel**
