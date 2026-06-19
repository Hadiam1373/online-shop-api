const errorHandler = (err, req, res, next) => {
  console.error("🔴 Error:", err);
  console.error("Stack:", err.stack);

  if (err.name === "ValidationError") {
    return res
      .status(400)
      .json({ message: "Validation Error", errors: err.details });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Prisma errors
  if (err.code === "P2002") {
    return res
      .status(409)
      .json({ message: "Duplicate entry", error: err.message });
  }

  if (err.code === "P2025") {
    return res
      .status(404)
      .json({ message: "Record not found", error: err.message });
  }

  if (err.code === "P2003") {
    return res
      .status(400)
      .json({ message: "Foreign key constraint failed", error: err.message });
  }

  if (err.code?.startsWith("P")) {
    return res
      .status(400)
      .json({ message: "Database error", error: err.message });
  }

  // Development: include error details
  if (process.env.NODE_ENV !== "production") {
    return res.status(err.status || 500).json({
      message: err.message || "Internal Server Error",
      error: err.toString(),
      code: err.code,
    });
  }

  // Production: generic error
  res.status(err.status || 500).json({
    message: "Internal Server Error",
  });
};

module.exports = errorHandler;
