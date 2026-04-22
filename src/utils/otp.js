// OTP (One-Time Password) Utility Functions

const generateOtp = (length = 6) => {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

const getOtpExpiry = (minutes = 5) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

module.exports = {
  generateOtp,
  getOtpExpiry,
};
