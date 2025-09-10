module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      message: "API is working!",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed"
  });
};
