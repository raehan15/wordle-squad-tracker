const { put, list } = require("@vercel/blob");

const BLOB_FILE = "wordle-scores.json";

// Default scores data
const defaultData = {
  scores: { raehan: 0, omar: 0, mahir: 0 },
  lastUpdated: new Date().toISOString(),
};

// Get scores from blob storage
async function getScoresFromBlob() {
  console.log("📥 [BLOB] Starting getScoresFromBlob");
  try {
    // Check if blob storage is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.log("⚠️ [BLOB] Blob storage not configured, using defaults");
      return defaultData;
    }

    // List all blobs to find our file
    console.log("📋 [BLOB] Listing blobs to find scores file");
    const { blobs } = await list();
    console.log(`📋 [BLOB] Found ${blobs.length} blobs`);
    const scoreBlob = blobs.find((blob) => blob.pathname === BLOB_FILE);

    if (scoreBlob) {
      console.log(`📄 [BLOB] Found scores blob: ${scoreBlob.url}`);
      const response = await fetch(scoreBlob.url);
      if (response.ok) {
        const data = await response.json();
        console.log(
          "✅ [BLOB] Successfully loaded data from blob:",
          JSON.stringify(data)
        );
        return data;
      } else {
        console.log(
          `❌ [BLOB] Failed to fetch blob, status: ${response.status}`
        );
      }
    } else {
      console.log("📭 [BLOB] No scores blob found, using defaults");
    }
  } catch (error) {
    console.log("❌ [BLOB] Error accessing blob storage:", error.message);
  }
  console.log("🔄 [BLOB] Returning default data");
  return defaultData;
}

// Save scores to blob storage with retry mechanism
async function saveScoresToBlob(data, retries = 3) {
  console.log(
    "💾 [BLOB] Starting saveScoresToBlob with data:",
    JSON.stringify(data)
  );
  
  // Check if blob storage is configured
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.log(
      "⚠️ [BLOB] Blob storage not configured - data will not persist"
    );
    return { url: "local-storage-only" };
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`💾 [BLOB] Writing to blob storage... (attempt ${attempt}/${retries})`);
      const blob = await put(BLOB_FILE, JSON.stringify(data, null, 2), {
        access: "public",
        addRandomSuffix: false,
      });
      console.log("✅ [BLOB] Successfully saved to blob:", blob.url);
      return blob;
    } catch (error) {
      console.error(`❌ [BLOB] Error saving to blob (attempt ${attempt}):`, error.message);
      
      if (attempt === retries) {
        // Final attempt failed
        console.error("❌ [BLOB] All retry attempts failed");
        return { url: "save-failed", error: error.message };
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`⏳ [BLOB] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
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
    console.log("🔍 [API] GET request received");
    try {
      const data = await getScoresFromBlob();
      console.log("📤 [API] Returning scores:", JSON.stringify(data.scores));

      return res.status(200).json({
        success: true,
        scores: data.scores,
        lastUpdated: data.lastUpdated,
        debug: "Data loaded from Vercel Blob storage",
      });
    } catch (error) {
      console.error("❌ [API] Error fetching scores:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch scores from blob storage",
        debug: error.message,
      });
    }
  }

  if (req.method === "POST") {
    console.log("🎯 [API] POST request received");
    try {
      const { player, change } = req.body;
      console.log(
        `🎯 [API] Update request: player=${player}, change=${change}`
      );

      // Validate input
      const validPlayers = ["raehan", "omar", "mahir"];
      if (!validPlayers.includes(player)) {
        console.log(`❌ [API] Invalid player: ${player}`);
        return res.status(400).json({
          success: false,
          error: "Invalid player",
        });
      }

      if (typeof change !== "number" || !Number.isInteger(change)) {
        console.log(`❌ [API] Invalid change value: ${change}`);
        return res.status(400).json({
          success: false,
          error: "Change must be an integer",
        });
      }

      if (Math.abs(change) > 100) {
        console.log(`❌ [API] Change too large: ${change}`);
        return res.status(400).json({
          success: false,
          error: "Change value too large (max ±100)",
        });
      }

      // Get current data
      console.log("📥 [API] Fetching current data from blob...");
      const currentData = await getScoresFromBlob();
      console.log(
        "📊 [API] Current data from blob:",
        JSON.stringify(currentData)
      );

      const currentScore = currentData.scores[player] || 0;
      const newScore = Math.max(0, currentScore + change);
      console.log(
        `🔢 [API] Score calculation: ${player} ${currentScore} + ${change} = ${newScore}`
      );

      // Update the score
      const updatedData = {
        scores: {
          ...currentData.scores,
          [player]: newScore,
        },
        lastUpdated: new Date().toISOString(),
      };
      console.log(
        "📊 [API] Updated data to save:",
        JSON.stringify(updatedData)
      );

      // Save to blob storage
      console.log("💾 [API] Saving to blob storage...");
      const saveResult = await saveScoresToBlob(updatedData);
      console.log("💾 [API] Save result:", saveResult.url);

      console.log(
        "📤 [API] Returning success response with scores:",
        JSON.stringify(updatedData.scores)
      );
      return res.status(200).json({
        success: true,
        message: `${player}'s score updated from ${currentScore} to ${newScore}`,
        scores: updatedData.scores,
        lastUpdated: updatedData.lastUpdated,
        debug: {
          blobUrl: saveResult.url,
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("❌ [API] Error updating score:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update score",
        debug: {
          message: error.message,
          stack: error.stack,
          hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed",
  });
};
