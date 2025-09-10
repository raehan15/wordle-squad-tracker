const { createClient } = require("@libsql/client");

// Initialize Turso client
let client = null;

function getClient() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

// Initialize database table
async function initializeDatabase() {
  const db = getClient();
  
  try {
    // Create table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS wordle_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player TEXT UNIQUE NOT NULL,
        score INTEGER DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default players if they don't exist
    const players = ['raehan', 'omar', 'mahir'];
    for (const player of players) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO wordle_scores (player, score) VALUES (?, 0)`,
        args: [player]
      });
    }
  } catch (error) {
    console.error('Database initialization error:', error);
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

  // Initialize database on first request
  await initializeDatabase();

  if (req.method === "GET") {
    try {
      const db = getClient();
      
      // Get all scores
      const result = await db.execute(`SELECT player, score, last_updated FROM wordle_scores ORDER BY player`);
      
      // Format scores object
      const scores = {};
      let lastUpdated = new Date().toISOString();
      
      result.rows.forEach(row => {
        scores[row.player] = row.score;
        if (row.last_updated > lastUpdated) {
          lastUpdated = row.last_updated;
        }
      });

      return res.status(200).json({
        success: true,
        scores,
        lastUpdated,
        debug: "Data loaded from Turso SQLite database"
      });
    } catch (error) {
      console.error("Error fetching scores:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch scores from database",
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

      const db = getClient();

      // Get current score
      const currentResult = await db.execute({
        sql: `SELECT score FROM wordle_scores WHERE player = ?`,
        args: [player]
      });

      const currentScore = currentResult.rows[0]?.score || 0;
      const newScore = Math.max(0, currentScore + change);

      // Update score in database
      await db.execute({
        sql: `UPDATE wordle_scores SET score = ?, last_updated = CURRENT_TIMESTAMP WHERE player = ?`,
        args: [newScore, player]
      });

      // Get all updated scores
      const allScoresResult = await db.execute(`SELECT player, score FROM wordle_scores ORDER BY player`);
      const updatedScores = {};
      allScoresResult.rows.forEach(row => {
        updatedScores[row.player] = row.score;
      });

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
