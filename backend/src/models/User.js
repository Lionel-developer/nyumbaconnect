const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^0?[17]\d{8}$/, 'Please enter a valid Kenyan phone number'],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },

    userType: {
      type: String,
      enum: ['landlord', 'tenant', 'agent'],
      required: true,
    },

    isVerified: { type: Boolean, default: false },

    idNumber: { type: String, sparse: true },

    properties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
    favorites: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
  },
],

    unlockedProperties: [
      {
        property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
        unlockedAt: { type: Date, default: Date.now },
        transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
      },
    ],

    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ phoneNumber: 1 }, { unique: true });
userSchema.index({ userType: 1 });

const sanitize = (ret) => {
  ret.id = ret._id;
  delete ret._id;
  delete ret.__v;

  delete ret.password;
  delete ret.refreshToken;
  delete ret.resetPasswordToken;
  delete ret.resetPasswordExpires;

  return ret;
};

userSchema.set('toJSON', { transform: (doc, ret) => sanitize(ret) });
userSchema.set('toObject', { transform: (doc, ret) => sanitize(ret) });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
