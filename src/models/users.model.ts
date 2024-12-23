import { model, Schema, Document } from 'mongoose';
import { User } from '@interfaces/users.interface';
import { USER_ROLES } from '../utils/constant';
const ObjectId = Schema.Types.ObjectId;
const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    isSubscribed: { type: Boolean, default: false },
    password: { type: String },
    googleId: { type: String },
    country: { type: String },
    phoneNumber: { type: String },
    profileImage: { type: String },
    about: { type: String },
    registrationDate: { type: String },
    subscription: { type: ObjectId, ref: 'Subscriptions' },
    verifyToken: { type: String },
    role: { type: Number, enum: USER_ROLES, default: 1 },
    isActive: { type: Boolean, default: true },
    token: { type: String },
    location: {
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false },
      address: { type: String, required: false },
    },
    dateOfBirth: { type: Date },
    paymentHistory: [{ type: ObjectId, ref: 'Transactions' }],
    preferences: {
      notifications: { type: Boolean, default: true },
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    },
    storeDetails: {
      storeName: { type: String },
      storeImage: { type: String },
      storeDescription: { type: String },
    },
    lastLogin: { type: Date },


  },

  { timestamps: true, versionKey: false },
);

UserSchema.index({ email: 1, phoneNumber: 1 }, { unique: true })
UserSchema.index({ fullName: 'text', token: 'text' })

export const UserModel = model<User & Document>('User', UserSchema, 'Users');






// import { model, Schema, Document } from 'mongoose';

// const SubscriptionSchema: Schema = new Schema(
//   {
//     user: { type: Schema.Types.ObjectId, ref: 'Users', required: true }, // Link to the user
//     type: { type: String, enum: ['FREE', 'MONTHLY', 'YEARLY'], required: true }, // Subscription type
//     startDate: { type: Date, required: true }, // Subscription start date
//     endDate: { type: Date, required: true }, // Subscription end date
//     isActive: { type: Boolean, default: true }, // Indicates if the subscription is active
//     paymentDetails: {
//       paymentId: { type: String }, // Payment transaction ID
//       amount: { type: Number }, // Amount paid
//       currency: { type: String, default: 'USD' }, // Currency
//     },
//   },
//   { timestamps: true, versionKey: false },
// );

// export const SubscriptionModel = model<Document>('Subscriptions', SubscriptionSchema, 'Subscriptions');
