const { translateMessage } = require("../utils/translations");

module.exports = (req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    try {
      if (body && typeof body === "object") {
        if (body.message) {
          body.message_fa = translateMessage(body.message);
        }

        if (body.error && typeof body.error === "string") {
          body.error_fa = translateMessage(body.error);
        }

        if (Array.isArray(body.errors)) {
          body.errors_fa = body.errors.map((e) => {
            if (typeof e === "string") return translateMessage(e);
            if (e && e.message) return translateMessage(e.message);
            return e;
          });
        }

        // If this is an error response, overwrite main fields with Persian translations
        const statusCode = this.statusCode || res.statusCode || 200;
        if (statusCode >= 400) {
          if (body.message) {
            body.message = translateMessage(body.message);
          }

          if (body.error && typeof body.error === "string") {
            body.error = translateMessage(body.error);
          }

          if (Array.isArray(body.errors)) {
            body.errors = body.errors.map((e) => {
              if (typeof e === "string") return translateMessage(e);
              if (e && e.message)
                return { ...e, message: translateMessage(e.message) };
              return e;
            });
          }
        }
      }
    } catch (e) {
      // ignore translation errors
    }
    return originalJson.call(this, body);
  };
  next();
};
