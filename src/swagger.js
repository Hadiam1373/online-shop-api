module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Online Shop API",
    version: "1.0.0",
    description: "Swagger documentation for the online shop backend API.",
  },
  servers: [
    {
      url: process.env.API_URL || "http://localhost:5000",
      description: "Development server",
    },
    {
      url: "http://127.0.0.1:5000",
      description: "Local server (127.0.0.1)",
    },
  ],
  tags: [
    { name: "Health", description: "Health check endpoint" },
    { name: "Auth", description: "Authentication and token management" },
    { name: "Users", description: "User profile, password and wishlist" },
    { name: "Products", description: "Product catalog CRUD operations" },
    { name: "Categories", description: "Category management" },
    { name: "Cart", description: "Shopping cart operations" },
    { name: "Orders", description: "Order creation and tracking" },
    { name: "Payments", description: "Payment processing and refunds" },
    { name: "Coupons", description: "Coupon validation and management" },
    { name: "Reviews", description: "Product reviews and moderation" },
    { name: "Admin", description: "Admin dashboard and reports" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          error: { type: "string" },
        },
      },
      AuthRegister: {
        type: "object",
        required: ["phone"],
        properties: {
          phone: { type: "string", example: "989123456789" },
          email: { type: "string", format: "email" },
          password: { type: "string", example: "password123" },
          address: { type: "string" },
        },
      },
      AuthLogin: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", example: "password123" },
        },
      },
      OtpRequest: {
        type: "object",
        required: ["phone"],
        properties: {
          phone: { type: "string", example: "989123456789" },
        },
      },
      OtpVerify: {
        type: "object",
        required: ["phone", "code"],
        properties: {
          phone: { type: "string", example: "989123456789" },
          code: { type: "string", example: "123456" },
        },
      },
      CompleteRegistration: {
        type: "object",
        required: ["phone"],
        properties: {
          phone: { type: "string", example: "989123456789" },
          email: { type: "string", format: "email" },
          password: { type: "string", example: "password123" },
          address: { type: "string" },
        },
      },
      PasswordResetRequest: {
        type: "object",
        required: ["phone"],
        properties: {
          phone: { type: "string", example: "989123456789" },
        },
      },
      PasswordResetConfirm: {
        type: "object",
        required: ["phone", "code", "newPassword", "confirmPassword"],
        properties: {
          phone: { type: "string", example: "989123456789" },
          code: { type: "string", example: "123456" },
          newPassword: { type: "string", example: "newPassword123" },
          confirmPassword: { type: "string", example: "newPassword123" },
        },
      },
      RefreshToken: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: { type: "string" },
        },
      },
      ProductInput: {
        type: "object",
        required: ["name", "price", "stock", "images", "categoryId"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          price: { type: "number", format: "float" },
          discountPrice: { type: "number", format: "float" },
          stock: { type: "integer", format: "int32" },
          images: { type: "array", items: { type: "string" } },
          categoryId: { type: "string" },
          attributes: { type: "object" },
        },
      },
      CategoryInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          parentId: { type: "string" },
        },
      },
      CartItemInput: {
        type: "object",
        required: ["productId", "quantity"],
        properties: {
          productId: { type: "string" },
          quantity: { type: "integer", format: "int32" },
        },
      },
      CouponValidation: {
        type: "object",
        required: ["code"],
        properties: {
          code: { type: "string" },
        },
      },
      CreateCoupon: {
        type: "object",
        required: ["code", "discountType", "discountValue"],
        properties: {
          code: { type: "string" },
          discountType: { type: "string", enum: ["PERCENTAGE", "FIXED"] },
          discountValue: { type: "number", format: "float" },
          expirationDate: { type: "string", format: "date-time" },
          usageLimit: { type: "integer", format: "int32" },
        },
      },
      OrderCreate: {
        type: "object",
        properties: {
          couponCode: { type: "string" },
        },
      },
      PaymentProcess: {
        type: "object",
        required: ["orderId", "cardToken"],
        properties: {
          orderId: { type: "string" },
          cardToken: { type: "string" },
          cardLast4: { type: "string" },
        },
      },
      ReviewInput: {
        type: "object",
        required: ["productId", "rating"],
        properties: {
          productId: { type: "string" },
          rating: { type: "integer", minimum: 1, maximum: 5 },
          comment: { type: "string" },
        },
      },
      PasswordChange: {
        type: "object",
        required: ["currentPassword", "newPassword", "confirmPassword"],
        properties: {
          currentPassword: { type: "string" },
          newPassword: { type: "string" },
          confirmPassword: { type: "string" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Check service health",
        responses: {
          200: {
            description: "Service is healthy",
          },
          503: {
            description: "Service unavailable",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthRegister" },
            },
          },
        },
        responses: {
          201: { description: "User registered" },
          400: { description: "Validation failed" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Authenticate a user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthLogin" },
            },
          },
        },
        responses: {
          200: { description: "Login successful" },
          400: { description: "Validation failed" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshToken" },
            },
          },
        },
        responses: {
          200: { description: "Token refreshed" },
          400: { description: "Validation failed" },
        },
      },
    },
    "/api/auth/request-otp": {
      post: {
        tags: ["Auth"],
        summary: "درخواست OTP برای شماره تلفن",
        description: "ارسال کد OTP 6 رقمی به شماره تلفن",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OtpRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "OTP ارسال شد",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    phone: { type: "string" },
                    otp: {
                      type: "string",
                      description: "فقط برای تست - در production حذف شود",
                    },
                  },
                },
              },
            },
          },
          400: { description: "خطای validation" },
        },
      },
    },
    "/api/auth/verify-otp": {
      post: {
        tags: ["Auth"],
        summary: "تایید OTP و ورود",
        description: "تایید کد OTP و دریافت access token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OtpVerify" },
            },
          },
        },
        responses: {
          200: {
            description: "ورود موفق",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    accessToken: { type: "string" },
                    refreshToken: { type: "string" },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        phone: { type: "string" },
                        email: { type: "string" },
                        address: { type: "string" },
                        role: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "کد OTP نادرست یا منقضی" },
        },
      },
    },
    "/api/auth/complete-registration": {
      post: {
        tags: ["Auth"],
        summary: "تکمیل ثبت‌نام",
        description: "اضافه کردن ایمیل، آدرس و رمز عبور بعد از تایید OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CompleteRegistration" },
            },
          },
        },
        responses: {
          200: {
            description: "ثبت‌نام تکمیل شد",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        phone: { type: "string" },
                        email: { type: "string" },
                        address: { type: "string" },
                        role: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: "کاربر یافت نشد" },
        },
      },
    },
    "/api/auth/request-password-reset": {
      post: {
        tags: ["Auth"],
        summary: "درخواست بازیابی رمز با OTP",
        description: "ارسال کد OTP برای بازنشانی رمز به شماره تلفن",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PasswordResetRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "OTP ارسال شد",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    phone: { type: "string" },
                    otp: {
                      type: "string",
                      description: "فقط برای تست - در production حذف شود",
                    },
                  },
                },
              },
            },
          },
          400: { description: "خطای validation" },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "بازنشانی رمز با OTP",
        description: "تایید کد OTP و تنظیم رمز جدید برای کاربر",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PasswordResetConfirm" },
            },
          },
        },
        responses: {
          200: { description: "رمز با موفقیت بازنشانی شد" },
          400: { description: "خطای validation یا کد نادرست" },
          404: { description: "کاربر یافت نشد" },
        },
      },
    },
    "/api/users/profile": {
      get: {
        tags: ["Users"],
        summary: "Get current user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "User profile returned" },
        },
      },
      put: {
        tags: ["Users"],
        summary: "Update current user profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  address: { type: "string", example: "Tehran, Valiasr St." },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Profile updated" },
        },
      },
    },
    "/api/users/change-password": {
      post: {
        tags: ["Users"],
        summary: "Change current user password",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PasswordChange" },
            },
          },
        },
        responses: {
          200: { description: "Password changed" },
          400: { description: "Validation failed" },
        },
      },
    },
    "/api/users/stats": {
      get: {
        tags: ["Users"],
        summary: "Get user statistics",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "User stats returned" } },
      },
    },
    "/api/users/orders": {
      get: {
        tags: ["Users"],
        summary: "Get user order history",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Order history returned" } },
      },
    },
    "/api/users/reviews": {
      get: {
        tags: ["Users"],
        summary: "Get current user reviews",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "User reviews returned" } },
      },
    },
    "/api/users/wishlist": {
      get: {
        tags: ["Users"],
        summary: "Get wishlist items",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Wishlist returned" } },
      },
      post: {
        tags: ["Users"],
        summary: "Add item to wishlist",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  productId: { type: "string" },
                },
                required: ["productId"],
              },
            },
          },
        },
        responses: { 200: { description: "Added to wishlist" } },
      },
    },
    "/api/users/account": {
      delete: {
        tags: ["Users"],
        summary: "Delete current user account",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["password"],
                properties: {
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Account deleted" } },
      },
    },
    "/api/products": {
      get: {
        tags: ["Products"],
        summary: "Get all products",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
            description: "Page number for pagination",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10 },
            description: "Number of products per page",
          },
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
            description: "Filter by category ID",
          },
          {
            name: "minPrice",
            in: "query",
            schema: { type: "number" },
            description: "Minimum product price",
          },
          {
            name: "maxPrice",
            in: "query",
            schema: { type: "number" },
            description: "Maximum product price",
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search product name or description",
          },
          {
            name: "availability",
            in: "query",
            schema: { type: "string", enum: ["in_stock", "out_of_stock"] },
            description: "Filter by stock availability",
          },
          {
            name: "hasDiscount",
            in: "query",
            schema: { type: "boolean" },
            description: "Return only discounted products",
          },
          {
            name: "sort",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "createdAt_desc",
                "createdAt_asc",
                "price_desc",
                "price_asc",
                "name_desc",
                "name_asc",
                "stock_desc",
                "stock_asc",
                "discount_desc",
                "discount_asc",
              ],
              default: "createdAt_desc",
            },
            description: "Sort products by field and direction",
          },
        ],
        responses: { 200: { description: "Products returned" } },
      },
      post: {
        tags: ["Products"],
        summary: "Create a new product",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ProductInput" },
            },
          },
        },
        responses: { 201: { description: "Product created" } },
      },
    },
    "/api/products/{id}": {
      get: {
        tags: ["Products"],
        summary: "Get a single product",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Product returned" } },
      },
      put: {
        tags: ["Products"],
        summary: "Update a product",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ProductInput" },
            },
          },
        },
        responses: { 200: { description: "Product updated" } },
      },
      delete: {
        tags: ["Products"],
        summary: "Delete a product",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Product deleted" } },
      },
    },
    "/api/categories": {
      get: {
        tags: ["Categories"],
        summary: "Get all categories",
        responses: { 200: { description: "Categories returned" } },
      },
      post: {
        tags: ["Categories"],
        summary: "Create category",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CategoryInput" },
            },
          },
        },
        responses: { 201: { description: "Category created" } },
      },
    },
    "/api/categories/tree": {
      get: {
        tags: ["Categories"],
        summary: "Get category tree",
        responses: { 200: { description: "Category tree returned" } },
      },
    },
    "/api/categories/{id}": {
      get: {
        tags: ["Categories"],
        summary: "Get category by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Category returned" } },
      },
      put: {
        tags: ["Categories"],
        summary: "Update category",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CategoryInput" },
            },
          },
        },
        responses: { 200: { description: "Category updated" } },
      },
      delete: {
        tags: ["Categories"],
        summary: "Delete category",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Category deleted" } },
      },
    },
    "/api/cart": {
      get: {
        tags: ["Cart"],
        summary: "Get current cart",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Cart returned" } },
      },
      post: {
        tags: ["Cart"],
        summary: "Add item to cart",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CartItemInput" },
            },
          },
        },
        responses: { 201: { description: "Item added to cart" } },
      },
      delete: {
        tags: ["Cart"],
        summary: "Clear the cart",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Cart cleared" } },
      },
    },
    "/api/cart/calculate-total": {
      post: {
        tags: ["Cart"],
        summary: "Calculate cart total with coupon",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrderCreate" },
            },
          },
        },
        responses: { 200: { description: "Total calculated" } },
      },
    },
    "/api/cart/{cartItemId}": {
      put: {
        tags: ["Cart"],
        summary: "Update cart item quantity",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "cartItemId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { quantity: { type: "integer", format: "int32" } },
                required: ["quantity"],
              },
            },
          },
        },
        responses: { 200: { description: "Cart item updated" } },
      },
      delete: {
        tags: ["Cart"],
        summary: "Remove an item from cart",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "cartItemId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Item removed" } },
      },
    },
    "/api/orders": {
      get: {
        tags: ["Orders"],
        summary: "Get current user orders",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Orders returned" } },
      },
      post: {
        tags: ["Orders"],
        summary: "Create a new order",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrderCreate" },
            },
          },
        },
        responses: { 201: { description: "Order created" } },
      },
    },
    "/api/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Get order details",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Order returned" } },
      },
    },
    "/api/orders/{id}/cancel": {
      put: {
        tags: ["Orders"],
        summary: "Cancel an order",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Order cancelled" } },
      },
    },
    "/api/orders/admin/all": {
      get: {
        tags: ["Orders"],
        summary: "Get all orders (admin)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "All orders returned" } },
      },
    },
    "/api/orders/{id}/status": {
      put: {
        tags: ["Orders"],
        summary: "Update order status",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: [
                      "PENDING",
                      "PAID",
                      "SHIPPED",
                      "DELIVERED",
                      "CANCELLED",
                    ],
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Order status updated" } },
      },
    },
    "/api/orders/admin/stats": {
      get: {
        tags: ["Orders"],
        summary: "Get order statistics (admin)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Order stats returned" } },
      },
    },
    "/api/payments": {
      post: {
        tags: ["Payments"],
        summary: "Process a payment",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PaymentProcess" },
            },
          },
        },
        responses: { 201: { description: "Payment processed" } },
      },
    },
    "/api/payments/{paymentId}": {
      get: {
        tags: ["Payments"],
        summary: "Get a payment by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "paymentId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Payment returned" } },
      },
    },
    "/api/payments/order/{orderId}": {
      get: {
        tags: ["Payments"],
        summary: "Get payment by order ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "orderId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Payment returned" } },
      },
    },
    "/api/payments/admin/all": {
      get: {
        tags: ["Payments"],
        summary: "Get all payments (admin)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "All payments returned" } },
      },
    },
    "/api/payments/admin/stats": {
      get: {
        tags: ["Payments"],
        summary: "Get payment statistics (admin)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Payment stats returned" } },
      },
    },
    "/api/payments/{paymentId}/refund": {
      post: {
        tags: ["Payments"],
        summary: "Refund a payment",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "paymentId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Payment refunded" } },
      },
    },
    "/api/coupons/validate": {
      post: {
        tags: ["Coupons"],
        summary: "Validate a coupon code",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CouponValidation" },
            },
          },
        },
        responses: { 200: { description: "Coupon validation result" } },
      },
    },
    "/api/coupons/{code}": {
      get: {
        tags: ["Coupons"],
        summary: "Get coupon by code",
        parameters: [
          {
            name: "code",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Coupon returned" } },
      },
    },
    "/api/coupons": {
      get: {
        tags: ["Coupons"],
        summary: "Get available coupons",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Coupons returned" } },
      },
      post: {
        tags: ["Coupons"],
        summary: "Create coupon",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCoupon" },
            },
          },
        },
        responses: { 201: { description: "Coupon created" } },
      },
    },
    "/api/coupons/{id}": {
      put: {
        tags: ["Coupons"],
        summary: "Update a coupon",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  discountValue: { type: "number", format: "float" },
                  expirationDate: { type: "string" },
                  usageLimit: { type: "integer", format: "int32" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Coupon updated" } },
      },
      delete: {
        tags: ["Coupons"],
        summary: "Delete a coupon",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Coupon deleted" } },
      },
    },
    "/api/coupons/admin/stats": {
      get: {
        tags: ["Coupons"],
        summary: "Get coupon statistics (admin)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Coupon stats returned" } },
      },
    },
    "/api/reviews/product/{productId}": {
      get: {
        tags: ["Reviews"],
        summary: "Get reviews for a product",
        parameters: [
          {
            name: "productId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Product reviews returned" } },
      },
    },
    "/api/reviews/{id}": {
      get: {
        tags: ["Reviews"],
        summary: "Get a review by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Review returned" } },
      },
      put: {
        tags: ["Reviews"],
        summary: "Update a review",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReviewInput" },
            },
          },
        },
        responses: { 200: { description: "Review updated" } },
      },
      delete: {
        tags: ["Reviews"],
        summary: "Delete a review",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Review deleted" } },
      },
    },
    "/api/reviews": {
      get: {
        tags: ["Reviews"],
        summary: "Get current user reviews",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "User reviews returned" } },
      },
      post: {
        tags: ["Reviews"],
        summary: "Create a review",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReviewInput" },
            },
          },
        },
        responses: { 201: { description: "Review created" } },
      },
    },
    "/api/reviews/admin/stats": {
      get: {
        tags: ["Reviews"],
        summary: "Get review statistics (admin)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Review stats returned" } },
      },
    },
    "/api/reviews/admin/pending": {
      get: {
        tags: ["Reviews"],
        summary: "Get pending reviews for moderation",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Pending reviews returned" } },
      },
    },
    "/api/reviews/{id}/moderate": {
      post: {
        tags: ["Reviews"],
        summary: "Moderate a review",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["approve"],
                properties: { approve: { type: "boolean" } },
              },
            },
          },
        },
        responses: { 200: { description: "Review moderated" } },
      },
    },
    "/api/admin/dashboard/stats": {
      get: {
        tags: ["Admin"],
        summary: "Get dashboard statistics",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Dashboard stats returned" } },
      },
    },
    "/api/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List users",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Users returned" } },
      },
    },
    "/api/admin/users/{userId}": {
      get: {
        tags: ["Admin"],
        summary: "Get user by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "User returned" } },
      },
      put: {
        tags: ["Admin"],
        summary: "Update user role",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { role: { type: "string" } },
                required: ["role"],
              },
            },
          },
        },
        responses: { 200: { description: "User role updated" } },
      },
    },
    "/api/admin/users/{userId}/ban": {
      post: {
        tags: ["Admin"],
        summary: "Ban a user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "User banned" } },
      },
    },
    "/api/admin/reports/sales": {
      get: {
        tags: ["Admin"],
        summary: "Get sales report",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Sales report returned" } },
      },
    },
    "/api/admin/reports/products": {
      get: {
        tags: ["Admin"],
        summary: "Get product report",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Product report returned" } },
      },
    },
    "/api/admin/reports/inventory": {
      get: {
        tags: ["Admin"],
        summary: "Get inventory report",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Inventory report returned" } },
      },
    },
    "/api/admin/reports/customers": {
      get: {
        tags: ["Admin"],
        summary: "Get customer insights",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Customer insights returned" } },
      },
    },
    "/api/wishlist": {
      get: {
        tags: ["Wishlist"],
        summary: "Get user's wishlist",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10 },
          },
        ],
        responses: {
          200: {
            description: "Wishlist retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          product: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              name: { type: "string" },
                              description: { type: "string" },
                              price: { type: "number" },
                              discountPrice: { type: "number" },
                              stock: { type: "integer" },
                              images: { type: "array" },
                              categoryId: { type: "string" },
                              attributes: { type: "object" },
                            },
                          },
                          addedAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                        pages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Wishlist"],
        summary: "Add product to wishlist",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  productId: { type: "string" },
                },
                required: ["productId"],
              },
            },
          },
        },
        responses: {
          201: { description: "Product added to wishlist" },
          400: { description: "Product ID is required" },
          404: { description: "Product not found" },
          409: { description: "Product already in wishlist" },
          401: { description: "Unauthorized" },
        },
      },
      delete: {
        tags: ["Wishlist"],
        summary: "Remove product from wishlist",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  productId: { type: "string" },
                },
                required: ["productId"],
              },
            },
          },
        },
        responses: {
          200: { description: "Product removed from wishlist" },
          404: { description: "Product not in wishlist" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/wishlist/check": {
      get: {
        tags: ["Wishlist"],
        summary: "Check if product is in wishlist",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "productId",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Product wishlist status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    isInWishlist: { type: "boolean" },
                    productId: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Product ID is required" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/wishlist/clear": {
      delete: {
        tags: ["Wishlist"],
        summary: "Clear entire wishlist",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Wishlist cleared",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    deletedCount: { type: "integer" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
  },
};
