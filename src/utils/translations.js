const translations = {
  "Service unavailable": "سرویس در دسترس نیست",
  "Route not found": "مسیر پیدا نشد",
  "Validation failed": "اعتبارسنجی ناموفق بود",
  "Validation Error": "خطای اعتبارسنجی",
  Unauthorized: "دسترسی غیرمجاز",
  "Duplicate entry": "ورودی تکراری",
  "Record not found": "رکورد پیدا نشد",
  "Foreign key constraint failed": "خطای محدودیت کلید خارجی",
  "Database error": "خطای پایگاه‌داده",
  "Internal Server Error": "خطای داخلی سرور",
  "Access denied. No token provided.": "دسترسی رد شد. توکن ارسال نشده است.",
  "Token expired.": "توکن منقضی شده است.",
  "Invalid token.": "توکن نامعتبر است.",
  "Authentication required": "نیاز به احراز هویت",
  "Access denied. Insufficient permissions.":
    "دسترسی رد شد. مجوزهای کافی نیست.",
  "Product ID is required": "شناسه محصول الزامی است",
  "Product not found": "محصول پیدا نشد",
  "Product already in wishlist": "محصول قبلاً در لیست علاقه‌مندی‌ها وجود دارد",
  "Product added to wishlist": "محصول به لیست علاقه‌مندی‌ها اضافه شد",
  "Product not in wishlist": "محصول در لیست علاقه‌مندی‌ها وجود ندارد",
  "Product removed from wishlist": "محصول از لیست علاقه‌مندی‌ها حذف شد",
  "Wishlist cleared": "لیست علاقه‌مندی‌ها پاک شد",
};

function translateMessage(msg) {
  if (typeof msg !== "string") return msg;
  if (translations[msg]) return translations[msg];
  return msg; // fallback: return original if no mapping
}

module.exports = { translateMessage };
