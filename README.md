# E-commerce Backend API

A scalable e-commerce backend built with Node.js, Express.js, PostgreSQL, and Prisma ORM.

## Features

- User authentication with JWT
- Role-based access control (User, Admin, Operator)
- Product management with CRUD operations
- Category management with nested support
- Shopping cart functionality
- Order management with status tracking
- Payment integration (mock)
- Coupon/discount system
- Product reviews and ratings
- Admin dashboard with statistics
- Full-text search and filtering
- Redis caching
- Rate limiting and security

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Password Hashing**: bcrypt
- **Caching**: Redis
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

## Getting Started

### Prerequisites

- Node.js (latest LTS)
- PostgreSQL
- Redis
- Docker & Docker Compose (optional, recommended for development)

### Installation - Option 1: Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in your values.

4. Set up the database:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   npm run db:seed
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3000`

### Installation - Option 2: Docker (Recommended)

1. Install Docker and Docker Compose
2. Clone the repository
3. Start the services:
   ```bash
   docker-compose up --build
   ```

The server will run on `http://localhost:5000`

**For detailed Docker instructions, see [DOCKER.md](./DOCKER.md)**

4. Set up the database:

   ```bash
   npx prisma migrate dev
   npx prisma generate
   npm run db:seed
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token

### Products

- `GET /api/products` - Get all products (with pagination, filtering, search)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)

### Categories

- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (Admin only)
- `PUT /api/categories/:id` - Update category (Admin only)
- `DELETE /api/categories/:id` - Delete category (Admin only)

### Cart

- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:itemId` - Update cart item quantity
- `DELETE /api/cart/:itemId` - Remove item from cart

### Orders

- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create order from cart
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status (Admin only)

### Payments

- `POST /api/payments` - Process payment (mock)

### Coupons

- `GET /api/coupons` - Get available coupons
- `POST /api/coupons` - Create coupon (Admin only)

### Reviews

- `GET /api/products/:id/reviews` - Get product reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

### Admin

- `GET /api/admin/users` - Manage users
- `GET /api/admin/orders` - Manage orders
- `GET /api/admin/stats` - Dashboard statistics

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middlewares/     # Custom middlewares
├── repositories/    # Data access layer
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
└── index.js         # Application entry point

prisma/
├── schema.prisma    # Database schema
└── seed.js          # Database seeding script
```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:seed` - Seed database with sample data

## License

ISC
