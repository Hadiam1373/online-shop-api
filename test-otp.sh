#!/bin/bash

# OTP Authentication API Test Script

API_URL="http://localhost:3000"
PHONE="989123456789"

echo "🔐 OTP Authentication API Test"
echo "================================"
echo ""

# Step 1: Request OTP
echo "1️⃣  درخواست OTP برای شماره: $PHONE"
echo ""
OTP_RESPONSE=$(curl -s -X POST "$API_URL/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$PHONE\"}")

echo "Response:"
echo "$OTP_RESPONSE" | jq .
echo ""

# Extract OTP from response (if available)
OTP=$(echo "$OTP_RESPONSE" | jq -r '.otp // empty')

if [ -z "$OTP" ]; then
  echo "⚠️  OTP نمایش داده نشد. برای تست، یک کد 6 رقمی وارد کنید:"
  read -p "OTP: " OTP
fi

echo ""

# Step 2: Verify OTP
echo "2️⃣  تایید OTP: $OTP"
echo ""
VERIFY_RESPONSE=$(curl -s -X POST "$API_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$PHONE\", \"code\": \"$OTP\"}")

echo "Response:"
echo "$VERIFY_RESPONSE" | jq .
echo ""

# Extract tokens
ACCESS_TOKEN=$(echo "$VERIFY_RESPONSE" | jq -r '.accessToken // empty')
REFRESH_TOKEN=$(echo "$VERIFY_RESPONSE" | jq -r '.refreshToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ خطا در تایید OTP. تست متوقف شد."
  exit 1
fi

echo "✅ OTP تایید شد!"
echo ""

# Step 3: Complete Registration
echo "3️⃣  تکمیل ثبت‌نام"
echo ""
COMPLETE_RESPONSE=$(curl -s -X POST "$API_URL/auth/complete-registration" \
  -H "Content-Type: application/json" \
  -d "{
    \"phone\": \"$PHONE\",
    \"email\": \"user@example.com\",
    \"address\": \"Tehran, Iran\",
    \"password\": \"secure_password123\"
  }")

echo "Response:"
echo "$COMPLETE_RESPONSE" | jq .
echo ""

echo "✅ تست تکمیل شد!"
echo ""
echo "📋 Token های دریافتی:"
echo "Access Token: $ACCESS_TOKEN"
echo "Refresh Token: $REFRESH_TOKEN"
