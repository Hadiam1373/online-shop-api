const Joi = require("joi");

const validate = (schema) => {
  return (req, res, next) => {
    // Allow unknown keys and strip them so clients can send extra fields
    // (e.g. productId) when updating resources without causing a validation error.
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    });
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));
      return res.status(400).json({ message: "Validation failed", errors });
    }
    next();
  };
};

module.exports = validate;
