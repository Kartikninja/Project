export interface Verification {
  token: String;
  expireTime: Date;
  isVerified: Boolean;
}



interface Location {
  type: string
  coordinates: [number, number]
}

// Creat User Interface based on User Schema
export interface User {
  _id?: string;
  email: string;
  password?: string;
  fullName: string;
  isVerified: Boolean;
  isSubscribed: Boolean;
  googleId: string;
  country: string;
  about: string;
  registrationDate: string;
  subscription: string;
  profileImage: string;
  phoneNumber: number;
  verifyToken: string;
  role?: number;
  isActive: Boolean;
  token: string;
  data?: object[]
  total?: number;
  lastLogin: Date;
  storeDetails: Object[]
  preferences: Object[]
  paymentHistory: string
  dateOfBirth: Date
  currentLocation: Location;
  resetPasswordToken: string;
  resetPasswordTokenExpiresAt: Date,
  verificationToken: string,
  verificationTokenExpiresAt: Date,
}
export interface UserList {
  data: [User];
}

export interface GoogleSignInBody {
  code: string;
}