const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },

    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      default: 50,
      min: 0,
    },

    mpesaReference: {
      type: String,
      sparse: true,
      trim: true,
    },

    mpesaPhone: { type: String, trim: true },
    mpesaReceipt: { type: String, trim: true },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },

    unlockedAt: { type: Date },
    failureReason: { type: String, trim: true },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

transactionSchema.index({ tenantId: 1, propertyId: 1 });
transactionSchema.index({ mpesaReference: 1 }, { unique: true, sparse: true });
transactionSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
