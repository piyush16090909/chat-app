// ============================================================
// middleware/authMiddleware.js — JWT Authentication Guard
//
// Attach this middleware to any route that requires a logged-in
// user. It reads the Bearer token from the Authorization header,
// verifies it, fetches the user from MongoDB, and attaches the
// user document to req.user so controllers can use it.
//
// Usage in a route file:
//   const protect = require("../middleware/authMiddleware");
//   router.get("/me", protect, getMe);
// ============================================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // The client sends: "Authorization: Bearer <token>"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorised, no token" });
  }

  try {
    // Verify signature + expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the full user document (minus password) to the request
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    // jwt.verify throws if the token is expired or tampered with
    return res.status(401).json({ message: "Not authorised, token failed" });
  }
};

module.exports = protect;
