import { model, Schema, Document } from 'mongoose';
import { User } from '@interfaces/users.interface';
import { USER_ROLES } from '../utils/constant';
const ObjectId = Schema.Types.ObjectId;
const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    password: { type: String },
    googleId: { type: String },
    country: { type: String },
    phoneNumber: { type: String },
    profileImage: { type: String },
    about: { type: String },
    registrationDate: { type: String },
    verifyToken: { type: String },
    role: { type: Number, enum: USER_ROLES, default: 1 },
    isActive: { type: Boolean, default: true },
    token: { type: String },
    verificationTokenExpiresAt: {
      type: Date,
      allowNull: true,
    },
    dateOfBirth: { type: Date },
    paymentHistory: [{ type: ObjectId, ref: 'Transactions' }],
    lastLogin: { type: Date },

    subscription: { type: ObjectId, ref: 'Subscriptions' },

    isSubscribed: { type: Boolean, default: false },

    discountApplied: [{
      type: ObjectId,
      ref: 'Discount',
      default: [],
    }],
    storesIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Store',
      default: []
    }],
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },

  },

  { timestamps: true, versionKey: false },
);

UserSchema.index({ email: 1, phoneNumber: 1 }, { unique: true })
UserSchema.index({ fullName: 'text', token: 'text' })
UserSchema.index({ currentLocation: '2dsphere' })


export const UserModel = model<User & Document>('User', UserSchema, 'Users');



