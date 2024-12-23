import { SECRET_KEY, FRONT_END_URL } from '@config';
import { HttpException } from '@exceptions/httpException';
import { DataStoredInToken, TokenData } from '@interfaces/auth.interface';
import { User, GoogleSignInBody } from '@interfaces/users.interface';
import { UserModel } from '@models/users.model';
import { compare, hash } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import { Service } from 'typedi';
import { sendForgotPasswordEmail, sendWelcomEmail } from '../utils/mailer';
import { verifyGoogleToken } from '../utils/utils'

const createToken = (user: User): TokenData => {
  const dataStoredInToken: DataStoredInToken = {
    _id: user._id,
    role: user.role,
    email: user.email
  };
  const expiresIn: string = '3d';

  return {
    expiresIn,
    token: sign(dataStoredInToken, SECRET_KEY, { expiresIn }),
  };
};

const verifyToken = (token: string): DataStoredInToken => {
  try {
    const decoded = verify(token, SECRET_KEY) as DataStoredInToken;
    return decoded;
  } catch (error) {
    throw new HttpException(401, 'Invalid token');
  }
};
@Service()
export class AuthService {
  public async signup(userData: User): Promise<{ user: User, token: string }> {
    const findUser: User = await UserModel.findOne({ email: userData.email, isActive: true });

    if (findUser) throw new HttpException(409, `This email ${userData.email} already exists`)
    else {
      userData.password = await hash(userData.password, 10);
      userData.email = userData.email.toLowerCase();
      const createUserData: User = await UserModel.create(userData);
      const tokenData = await createToken(createUserData).token;
      await sendWelcomEmail(userData.email, userData.fullName);
      await UserModel.updateOne({ _id: createUserData._id }, { token: tokenData })
      return { user: createUserData, token: tokenData };
    }
  }

  public async googleSingIn(body: GoogleSignInBody): Promise<{ user: User, token: string }> {
    const { code } = body;
    const userInfo = await verifyGoogleToken(code)
    const { sub, name, picture, email } = userInfo;
    const findUser: User = await UserModel.findOne({ email, isActive: true }).lean();

    if (findUser && findUser.password && !findUser.googleId) throw new HttpException(409, `You have Manualy Signed in with Email: ${findUser.email} and password. Please use Manual Login `)
    else if (findUser.googleId) {
      const tokenData = await createToken(findUser).token;
      await UserModel.updateOne({ _id: findUser._id }, { token: tokenData })
      return { user: findUser, token: tokenData };
    }

    const userObj = {
      email,
      fullName: name,
      profileImage: picture,
      googleId: sub
    }
    const user = await UserModel.create(userObj)
    const tokenData = await createToken(user).token;
    await UserModel.updateOne({ _id: user._id }, { token: tokenData })

    return { user, token: tokenData };
  }

  public async login(userData: User): Promise<{ findUser: User, tokenData: string }> {
    const { email, password } = userData

    const findUser: User = await UserModel.findOne({ email, isActive: true }).lean()
    if (!findUser) throw new HttpException(401, `Email Does not Exist, Please Sing Up`);
    if (!findUser.password) throw new HttpException(401, `You are logged-in via social platform. Please login in with your social account`);

    const data = await compare(password, findUser.password)
    if (!data) throw new HttpException(409, `Invalid Password`);
    else {
      const tokenData = await createToken(findUser).token;
      await UserModel.updateOne({ _id: findUser._id }, { token: tokenData })
      delete findUser.password
      delete findUser.token
      return { findUser, tokenData };
    }
  }

  public async logout(user: User): Promise<boolean> {
    await UserModel.updateOne({ _id: user._id }, { token: '' })
    return true
  }

  public async adminLogin(userData: User): Promise<{ findUser: User, tokenData: string }> {
    const { email, password } = userData

    const findUser: User = await UserModel.findOne({ email, isActive: true, role: { $in: [1, 2] } });
    if (!findUser) throw new HttpException(401, `Email Doesnot Exist, Please Sing Up`);

    const isPasswordMatching: boolean = await compare(password, findUser.password);
    if (!isPasswordMatching) throw new HttpException(409, 'Invalid Password');

    const tokenData = await createToken(findUser).token;
    return { findUser, tokenData };
  }

  public async forgotPassword(userData: User): Promise<User> {
    const user: User = await UserModel.findOne({ ...userData, isActive: true });
    if (!user) throw new HttpException(409, "User doesn't exist");
    const token = await createToken(user).token;
    await UserModel.findByIdAndUpdate(user._id, { verifyToken: token }, { new: true });
    const link = `${FRONT_END_URL}/reset-password/${token}`;
    await sendForgotPasswordEmail(user.email, user.fullName, link);
    return user;
  }

  public async verifyuserToken(verifyToken: string): Promise<{ findUser: User, tokenData: string }> {
    const findUser: User = await UserModel.findOne({ verifyToken, isActive: true });
    if (!findUser) throw new HttpException(409, `This token was not valid`);
    const tokenData = await createToken(findUser).token;
    return { findUser, tokenData };
  }

  public async resetPassword(userData: User): Promise<User> {
    const { token, password } = userData;
    const decoded = verifyToken(token);
    const { email } = decoded;
    const user = await UserModel.findOne({ email, isActive: true });
    if (!user) throw new HttpException(409, "User doesn't exist");
    const hashedPassword = await hash(password, 10);
    const updatedUser = await UserModel.findByIdAndUpdate(user._id, { password: hashedPassword });
    return updatedUser;
  }
}
