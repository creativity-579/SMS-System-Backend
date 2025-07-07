const jwt = require("jsonwebtoken");
require("dotenv").config();

const validateRegistration = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }
  next();
};

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Authorization token missing or invalid" });
    }
    let token = authHeader.split(" ")[1];
    token = token.replace(/^["']|["']$/g, "");
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.log("JWT verification error:", err.name, err.message);
        return res.status(403).json({ error: "Token verification failed" });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    console.log("Authentication middleware error:", error);
    return res
      .status(500)
      .json({ error: "Internal server error during authentication" });
  }
};

module.exports = {
  validateRegistration,
  authenticateToken,
};
