const { put, head } = require("@vercel/blob");

const BLOB_FILE = "wordle-scores.json";

// Default scores data
const defaultData = {
  scores: { raehan: 0, omar: 0, mahir: 0 },
  lastUpdated: new Date().toISOString()
};

// Get scores from blob storage
async function getScoresFromBlob() {
  try {
    const response = await fetch(`https://${process.env.BLOB_READ_WRITE_TOKEN?.split('_')[1]}.blob.vercel-storage.com/${BLOB_FILE}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log("No existing scores found, using defaults");
  }
  return defaultData;
}

// Save scores to blob storage
async function saveScoresToBlob(data) {
  try {
    const blob = await put(BLOB_FILE, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false
    });
    return blob;
  } catch (error) {
    console.error("Error saving to blob:", error);
    throw error;
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
      const { player, change, password } = req.body;

      // Verify password
      if (password !== "wordle123") {
        return res.status(401).json({
          success: false,
          error: "Invalid password",
        });
      }

      // Validate player
      const validPlayers = ["raehan", "omar", "mahir"];
      if (!validPlayers.includes(player)) {
        return res.status(400).json({
          success: false,
          error: "Invalid player",
        });
      }

      // Get current data
      const currentData = await getScoresFromBlob();
      const currentScore = currentData.scores[player] || 0;
      const newScore = Math.max(0, currentScore + change);

      // Update the score
      const updatedData = {
        scores: {
          ...currentData.scores,
          [player]: newScore
        },
        lastUpdated: new Date().toISOString()
      };

      // Save to blob storage
      await saveScoresToBlob(updatedData);

      return res.status(200).json({
        success: true,
        message: `${player}'s score updated from ${currentScore} to ${newScore}`,
        scores: updatedData.scores,
        lastUpdated: updatedData.lastUpdated,
      });
    } catch (error) {
      console.error("Error updating score:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update score",
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed",
  });
}
