module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const { password } = req.body;

      if (password === "wordle123") {
        return res.status(200).json({
          success: true,
          message: "Password verified",
        });
      } else {
        return res.status(401).json({
          success: false,
          error: "Invalid password",
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed",
  });
};
