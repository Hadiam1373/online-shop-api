# OTP Phone-Based Authentication Guide

## Overview

سیستم احراز هویت شماره تلفن بر اساس OTP (یک‌بار‌رمز) پیاده‌سازی شده است. کاربران می‌تواند با شماره تلفن و کد تایید وارد شوند.

## API Endpoints

### 1️⃣ درخواست OTP

**Endpoint:** `POST /auth/request-otp`

**Body:**

```json
{
  "phone": "989123456789"
}
```

**Response (Success):**

```json
{
  "message": "OTP sent to your phone",
  "phone": "989123456789"
}
```

**Response (Testing Only - در production حذف شود):**

```json
{
  "message": "OTP sent to your phone",
  "phone": "989123456789",
  "otp": "123456"
}
```

**مراحل:**

- اگر کاربر جدید است: حساب جدید ایجاد می‌شود
- کد OTP تولید و 5 دقیقه معتبر است
- _(Production)_ کد از طریق SMS/Twilio ارسال می‌شود

---

### 2️⃣ تایید OTP و ورود

**Endpoint:** `POST /auth/verify-otp`

**Body:**

```json
{
  "phone": "989123456789",
  "code": "123456"
}
```

**Response (Success):**

```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "clm3x1234",
    "phone": "989123456789",
    "email": null,
    "address": null,
    "role": "USER"
  }
}
```

**خطاهای ممکن:**

- `Invalid OTP` - کد اشتباه است
- `OTP expired or not found` - کد منقضی شده یا وجود ندارد
- `Too many attempts` - بیش از 3 تلاش ناموفق

---

### 3️⃣ تکمیل ثبت‌نام

بعد از verify OTP، کاربر می‌تواند ایمیل و آدرس اضافه کند:

**Endpoint:** `POST /auth/complete-registration`

**Body:**

```json
{
  "phone": "989123456789",
  "email": "user@example.com",
  "address": "Tehran, Iran",
  "password": "secure_password123"
}
```

**Response (Success):**

```json
{
  "message": "Registration completed successfully",
  "user": {
    "id": "clm3x1234",
    "phone": "989123456789",
    "email": "user@example.com",
    "address": "Tehran, Iran",
    "role": "USER"
  }
}
```

---

## Authentication Flow

### 🔄 Flow نحوی ثبت‌نام:

```
1. POST /auth/request-otp
   └─ ایجاد کاربر + ارسال OTP

2. POST /auth/verify-otp
   └─ تایید کد + دریافت tokens

3. POST /auth/complete-registration (اختیاری)
   └─ اضافه کردن ایمیل و آدرس
```

### 🔄 Flow ورود مجدد:

```
1. POST /auth/request-otp
   └─ ارسال OTP دوباره

2. POST /auth/verify-otp
   └─ دریافت tokens
```

---

## Database Schema

### User Model

```prisma
model User {
  id       String
  phone    String @unique        // شماره تلفن منحصر‌به‌فرد
  email    String? @unique       // ایمیل اختیاری
  password String?               // رمز عبور اختیاری
  address  String?               // آدرس اختیاری
  role     Role @default(USER)   // نقش کاربر

  refreshTokens RefreshToken[]
  otpCodes      OtpCode[]
  carts         Cart[]
  orders        Order[]
  reviews       Review[]
}
```

### OtpCode Model

```prisma
model OtpCode {
  id        String
  phone     String
  code      String
  expiresAt DateTime       // معتبر تا 5 دقیقه
  attempts  Int @default(0) // تعداد تلاش‌های ناموفق (max: 3)

  user      User
  userId    String
}
```

---

## Testing

### نمونه درخواست cURL:

```bash
# 1. درخواست OTP
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "989123456789"}'

# 2. تایید OTP (کد را از response اول استخراج کنید)
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "989123456789", "code": "123456"}'

# 3. تکمیل ثبت‌نام
curl -X POST http://localhost:3000/auth/complete-registration \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "989123456789",
    "email": "user@example.com",
    "address": "Tehran, Iran",
    "password": "secure_password123"
  }'
```

---

## توجهات برای Production

1. **OTP ارسال شدن:** فعلاً OTP در response نمایش داده می‌شود. برای production:
   - فایل `src/controllers/auth.js` را بازکنید
   - کد OTP را در `requestOtp` حذف کنید
   - Twilio یا سرویس SMS دیگری را انتگریت کنید

2. **Phone Format:** شماره‌های تلفن باید فرمت یکسانی داشته باشند

3. **Rate Limiting:** درخواست‌های بیش‌ازحد OTP را محدود کنید

4. **Email Verification:** (اختیاری) ایمیل هم تایید شود

---

## عقب‌مانی (Legacy) Support

روش‌های قدیم هنوز کار می‌کنند:

```bash
# Traditional email + password login
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Traditional registration
POST /auth/register
{
  "phone": "989123456789",
  "email": "user@example.com",
  "password": "password123",
  "address": "Tehran, Iran"
}
```
