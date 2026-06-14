const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err && err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired." });
    }

    return res.status(401).json({ message: "Invalid token." });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // support both authorize('ADMIN') and authorize(['ADMIN', 'OPERATOR'])
    const allowedRoles =
      roles.length === 1 && Array.isArray(roles[0]) ? roles[0] : roles;

    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Access denied. Insufficient permissions." });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
