const { kv } = require("@vercel/kv");

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
      // Get all scores from Vercel KV
      const scores = (await kv.hgetall("wordle:scores")) || {
        raehan: 0,
        omar: 0,
        mahir: 0,
      };

      const lastUpdated =
        (await kv.get("wordle:lastUpdated")) || new Date().toISOString();

      return res.status(200).json({
        success: true,
        scores,
        lastUpdated,
      });
    } catch (error) {
      console.error("Error fetching scores:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch scores",
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

      // Get current scores
      const currentScores = (await kv.hgetall("wordle:scores")) || {
        raehan: 0,
        omar: 0,
        mahir: 0,
      };

      // Calculate new score (prevent negative scores)
      const currentScore = parseInt(currentScores[player]) || 0;
      const newScore = Math.max(0, currentScore + change);

      // Update score in KV
      await kv.hset("wordle:scores", { [player]: newScore });
      await kv.set("wordle:lastUpdated", new Date().toISOString());

      // Get updated scores
      const updatedScores = await kv.hgetall("wordle:scores");

      return res.status(200).json({
        success: true,
        message: `${player}'s score updated from ${currentScore} to ${newScore}`,
        scores: updatedScores,
        lastUpdated: new Date().toISOString(),
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
