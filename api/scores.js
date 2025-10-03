const { put, list } = require("@vercel/blob");

const BLOB_FILE = "wordle-scores.json";

// Default scores data
const defaultData = {
  scores: { raehan: 0, omar: 0, mahir: 0, hadi: 0, fawaz: 0 },
  lastUpdated: new Date().toISOString(),
};

// Cache to reduce blob storage calls
let dataCache = null;
let cacheTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Get scores from blob storage with caching
async function getScoresFromBlob() {
  console.log("📥 [BLOB] Starting getScoresFromBlob");

  // Return cached data if still fresh
  if (dataCache && Date.now() - cacheTime < CACHE_DURATION) {
    console.log("💾 [BLOB] Returning cached data");
    return dataCache;
  }

  try {
    // Check if blob storage is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.log("⚠️ [BLOB] Blob storage not configured, using defaults");
      dataCache = defaultData;
      cacheTime = Date.now();
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

        // Validate data structure
        if (!data.scores || typeof data.scores !== "object") {
          console.log("⚠️ [BLOB] Invalid data structure, using defaults");
          dataCache = defaultData;
          cacheTime = Date.now();
          return defaultData;
        }

        console.log(
          "✅ [BLOB] Successfully loaded data from blob:",
          JSON.stringify(data)
        );
        dataCache = data;
        cacheTime = Date.now();
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
  dataCache = defaultData;
  cacheTime = Date.now();
  return defaultData;
}

// Save scores to blob storage with better error handling
async function saveScoresToBlob(data) {
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

  // Validate data before saving
  if (!data.scores || typeof data.scores !== "object") {
    console.error("❌ [BLOB] Invalid data structure for saving");
    return { url: "invalid-data", error: "Invalid data structure" };
  }

  try {
    console.log("💾 [BLOB] Writing to blob storage...");
    const blob = await put(BLOB_FILE, JSON.stringify(data, null, 2), {
      access: "public",
      addRandomSuffix: false,
    });
    console.log("✅ [BLOB] Successfully saved to blob:", blob.url);

    // Update cache with new data
    dataCache = data;
    cacheTime = Date.now();

    return blob;
  } catch (error) {
    console.error("❌ [BLOB] Error saving to blob:", error.message);
    return { url: "save-failed", error: error.message };
  }
}

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

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
      });
    } catch (error) {
      console.error("❌ [API] Error fetching scores:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch scores",
        scores: defaultData.scores, // Fallback scores
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
      const validPlayers = ["raehan", "omar", "mahir", "hadi", "fawaz"];
      if (!validPlayers.includes(player)) {
        console.log(`❌ [API] Invalid player: ${player}`);
        return res.status(400).json({
          success: false,
          error: `Invalid player. Must be one of: ${validPlayers.join(", ")}`,
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

      // Get current data (this will use cache if available)
      console.log("📥 [API] Fetching current data...");
      const currentData = await getScoresFromBlob();
      console.log("📊 [API] Current data:", JSON.stringify(currentData));

      const currentScore = currentData.scores[player] || 0;
      const newScore = Math.max(0, currentScore + change);
      console.log(
        `🔢 [API] Score calculation: ${player} ${currentScore} + ${change} = ${newScore}`
      );

      // Create updated data
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

      // Check if save was successful
      const saveSuccess = !saveResult.error && saveResult.url !== "save-failed";

      console.log(
        "📤 [API] Returning response with scores:",
        JSON.stringify(updatedData.scores)
      );
      return res.status(200).json({
        success: true,
        message: `${player}'s score updated from ${currentScore} to ${newScore}`,
        scores: updatedData.scores,
        lastUpdated: updatedData.lastUpdated,
        saved: saveSuccess,
      });
    } catch (error) {
      console.error("❌ [API] Error updating score:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update score",
        debug: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed",
  });
};
