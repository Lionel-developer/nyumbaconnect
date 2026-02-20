
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { validateKenyanPhone } = require('../utils/validatePhone');
const mongoose = require('mongoose');


const getExpiresIn = () => process.env.JWT_EXPIRES_IN || '30d';

const toPublicUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  phoneNumber: user.phoneNumber,
  email: user.email || null,
  userType: user.userType,
  isVerified: user.isVerified,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastLogin: user.lastLogin || null,
});

const registerUser = async (req, res) => {
  try {
    let { fullName, phoneNumber, email, userType, idNumber } = req.body;

    if (!fullName || !phoneNumber || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide fullName, phoneNumber and userType',
      });
    }

    if (!['landlord', 'tenant', 'agent'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type. Must be landlord, tenant, or agent',
      });
    }

    const { isValid, formatted } = validateKenyanPhone(phoneNumber);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid Kenyan phone number (e.g., 0712345678)',
      });
    }

    email = typeof email === 'string' ? email.trim().toLowerCase() : undefined;
    idNumber = typeof idNumber === 'string' ? idNumber.trim() : undefined;

    const userExists = await User.findOne({ phoneNumber: formatted });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists',
      });
    }

    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use',
        });
      }
    }

    const user = await User.create({
      fullName,
      phoneNumber: formatted,
      email: email || undefined,
      userType,
      idNumber: idNumber || undefined,
      isVerified: false,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: toPublicUser(user),
        token,
        expiresIn: getExpiresIn(),
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number',
      });
    }

    const { isValid, formatted } = validateKenyanPhone(phoneNumber);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid Kenyan phone number',
      });
    }

    const user = await User.findOne({ phoneNumber: formatted });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please register first.',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: toPublicUser(user),
        token,
        expiresIn: getExpiresIn(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

const getProfile = async (req, res) => {
  try {
    let query = User.findById(req.user._id).select('-__v');

    const hasPropertyModel = mongoose.modelNames().includes('Property');

    if (hasPropertyModel) {
      query = query
        .populate('properties', 'title location price')
        .populate({
          path: 'unlockedProperties.property',
          select: 'title location price propertyType',
        });
    }

    const user = await query;

    return res.json({
      success: true,
      data: user,
      populated: hasPropertyModel,
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, email } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (typeof fullName === 'string' && fullName.trim()) user.fullName = fullName.trim();

    if (typeof email === 'string' && email.trim()) {
      const nextEmail = email.trim().toLowerCase();

      const emailExists = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use',
        });
      }

      user.email = nextEmail;
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: toPublicUser(user),
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating profile',
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
};
