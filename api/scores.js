const { put, list } = require("@vercel/blob");

const BLOB_FILE = "wordle-scores.json";

// Default scores data
const defaultData = {
  scores: { raehan: 0, omar: 0, mahir: 0 },
  lastUpdated: new Date().toISOString()
};

// Get scores from blob storage
async function getScoresFromBlob() {
  try {
    // Check if blob storage is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.log("Blob storage not configured, using defaults");
      return defaultData;
    }

    // List all blobs to find our file
    const { blobs } = await list();
    const scoreBlob = blobs.find(blob => blob.pathname === BLOB_FILE);
    
    if (scoreBlob) {
      const response = await fetch(scoreBlob.url);
      if (response.ok) {
        const data = await response.json();
        console.log("Loaded data from blob:", data);
        return data;
      }
    }
    
    console.log("No blob found, using defaults");
  } catch (error) {
    console.log("Error accessing blob storage:", error.message);
  }
  return defaultData;
}

// Save scores to blob storage
async function saveScoresToBlob(data) {
  try {
    // Check if blob storage is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.log("Blob storage not configured - data will not persist");
      return { url: "local-storage-only" };
    }

    const blob = await put(BLOB_FILE, JSON.stringify(data, null, 2), {
      access: 'public',
      addRandomSuffix: false
    });
    console.log("Saved to blob:", blob.url);
    return blob;
  } catch (error) {
    console.error("Error saving to blob:", error);
    // Don't throw error, just log it and continue
    return { url: "save-failed", error: error.message };
  }
}

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    try {
      const data = await getScoresFromBlob();
      
      return res.status(200).json({
        success: true,
        scores: data.scores,
        lastUpdated: data.lastUpdated,
        debug: "Data loaded from Vercel Blob storage"
      });
    } catch (error) {
      console.error("Error fetching scores:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch scores from blob storage",
        debug: error.message
      });
    }
  }

  if (req.method === "POST") {
    try {
      const { player, change } = req.body;

      // Validate player
      const validPlayers = ["raehan", "omar", "mahir"];
      if (!validPlayers.includes(player)) {
        return res.status(400).json({
          success: false,
          error: "Invalid player",
        });
      }

      // Get current data
      console.log("Fetching current data from blob...");
      const currentData = await getScoresFromBlob();
      console.log("Current data:", currentData);
      
      const currentScore = currentData.scores[player] || 0;
      const newScore = Math.max(0, currentScore + change);
      console.log(`Updating ${player}: ${currentScore} → ${newScore}`);

      // Update the score
      const updatedData = {
        scores: {
          ...currentData.scores,
          [player]: newScore
        },
        lastUpdated: new Date().toISOString()
      };

      // Save to blob storage
      console.log("Saving to blob storage...");
      const saveResult = await saveScoresToBlob(updatedData);
      console.log("Save result:", saveResult.url);

      return res.status(200).json({
        success: true,
        message: `${player}'s score updated from ${currentScore} to ${newScore}`,
        scores: updatedData.scores,
        lastUpdated: updatedData.lastUpdated,
        debug: {
          blobUrl: saveResult.url,
          environment: process.env.NODE_ENV
        }
      });
    } catch (error) {
      console.error("Error updating score:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update score",
        debug: {
          message: error.message,
          stack: error.stack,
          hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN
        }
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed",
  });
}
