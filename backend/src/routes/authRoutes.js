const express = require('express');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const router = express.Router();

// Validation middleware
const validateRegistration = (req, res, next) => {
  const { email, password, fullname, vin } = req.body;
  
  const errors = [];
  
  // Email validation
  if (!email) {
    errors.push('Email is required');
  } else if (!validator.isEmail(email)) {
    errors.push('Please provide a valid email address');
  }
  
  // Password validation
  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  } else if (!validator.isStrongPassword(password, { 
    minLength: 6, 
    minLowercase: 1, 
    minUppercase: 1, 
    minNumbers: 1, 
    minSymbols: 0 
  })) {
    errors.push('Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number');
  }
  
  // Name validation
  if (!fullname) {
    errors.push('Full name is required');
  } else if (fullname.length < 2) {
    errors.push('Full name must be at least 2 characters long');
  } else if (!validator.isLength(fullname, { min: 2, max: 80 })) {
    errors.push('Full name must be less than 80 characters');
  }
  
  // VIN validation
  if (!vin) {
    errors.push('Voter ID is required');
  } else if (!validator.isLength(vin, { min: 3, max: 20 })) {
    errors.push('Voter ID must be between 3 and 20 characters');
  } else if (!/^[A-Za-z0-9]+$/.test(vin)) {
    errors.push('Voter ID can only contain letters and numbers');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  next();
};

// Check if user already exists
const checkUserExists = async (email, vin) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM User WHERE email = ? OR vin = ?',
      [email, vin]
    );
    return result[0].count > 0;
  } catch (error) {
    throw error;
  }
};

// Generate VIN if not provided
const generateVIN = () => {
  const prefix = 'VTR';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

// POST /api/auth/register
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { email, password, fullname, vin } = req.body;
    
    // Check if user already exists
    const userExists = await checkUserExists(email, vin || generateVIN());
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or Voter ID already exists'
      });
    }
    
    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Generate VIN if not provided
    const finalVin = vin || generateVIN();
    
    // Create user
    const result = await query(
      `INSERT INTO User (vin, fullname, email, password, role, isActive, emailVerified, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, 'voter', 1, 0, NOW(), NOW())`,
      [finalVin, fullname, email, hashedPassword]
    );
    
    // Get created user
    const newUser = await query(
      'SELECT userId, vin, fullname, email, role, isActive, emailVerified, createdAt FROM User WHERE userId = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: newUser[0],
        voterId: finalVin
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'User with this email or Voter ID already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
