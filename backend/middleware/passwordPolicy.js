// Password Policy Middleware
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }

  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common patterns
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /admin/i,
    /letmein/i
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password cannot contain common patterns');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const passwordPolicy = (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Password is required'
    });
  }

  const validation = validatePassword(password);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: 'Password does not meet security requirements',
      details: validation.errors
    });
  }

  next();
};

module.exports = { passwordPolicy, validatePassword };
