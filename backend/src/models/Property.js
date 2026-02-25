const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Property title is required'],
      trim: true,
    },

    // Normalized fields (for duplicate prevention)
    titleNorm: { type: String, trim: true, index: true },

    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },

    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },

    // Normalized fields (for duplicate prevention)
    locationNorm: { type: String, trim: true, index: true },

    area: { type: String, trim: true },

    // Normalized fields (for duplicate prevention)
    areaNorm: { type: String, trim: true, index: true },

    nearby: [{ type: String, trim: true }],

    propertyType: {
      type: String,
      enum: ['bedsitter', 'studio', 'apartment', '1-bedroom', '2-bedroom', '3-bedroom', 'commercial'],
      required: true,
      index: true,
    },

    price: {
      type: Number,
      required: [true, 'Monthly rent is required'],
      min: 0,
      index: true,
    },

    images: [
      {
        url: { type: String, trim: true },
        isPrimary: { type: Boolean, default: false },
      },
    ],

    amenities: [
      {
        type: String,
        enum: ['water', 'electricity', 'parking', 'security', 'furnished', 'WiFi', 'gym', 'swimming pool'],
      },
    ],

    rules: {
      pets: { type: Boolean, default: false },
      children: { type: Boolean, default: true },
      visitors: { type: String, enum: ['allowed', 'restricted'], default: 'allowed' },
      depositMonths: { type: Number, default: 1, min: 0 },
    },

    contactPerson: { type: String, required: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },

    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    verificationDate: { type: Date },

    views: { type: Number, default: 0, min: 0 },
    totalUnlocks: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ✅ Normalize fields (trim/lowercase/collapse spaces) — FIXED (no next)
propertySchema.pre('validate', function () {
  this.titleNorm = (this.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
  this.locationNorm = (this.location || '').trim().toLowerCase().replace(/\s+/g, ' ');
  this.areaNorm = (this.area || '').trim().toLowerCase().replace(/\s+/g, ' ');
});

// Existing indexes
propertySchema.index({ location: 1, price: 1, propertyType: 1 });
propertySchema.index({ title: 'text', description: 'text' });

// ✅ Duplicate-prevention unique index (per landlord)
propertySchema.index(
  { landlordId: 1, titleNorm: 1, locationNorm: 1, areaNorm: 1, price: 1, propertyType: 1 },
  { unique: true }
);

module.exports = mongoose.models.Property || mongoose.model('Property', propertySchema);