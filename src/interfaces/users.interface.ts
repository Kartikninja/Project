export interface Verification {
  token: String;
  expireTime: Date;
  isVerified: Boolean;
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
  role: number;
  isActive: Boolean;
  token: string;
  data?: object[]
  total?: number;
}
export interface UserList {
  data: [User];
}

export interface GoogleSignInBody {
  code: string;
 }