import { NextFunction, Request, Response } from "express";
import { Container } from "typedi";
import { User, GoogleSignInBody } from "@interfaces/users.interface";
import { TokenData } from '@interfaces/auth.interface';
import { AuthService } from "@services/auth.service";
import { HttpException } from "@/exceptions/httpException";
import { pick } from "@utils/utils"

export class AuthController {
  public auth = Container.get(AuthService);

  public signUp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = pick(req.body);
      const signUpUserData = await this.auth.signup(req.body);
      const user = signUpUserData.user

      return res.status(201).json({ data: { user, token: signUpUserData.token }, message: "Register Success" });
    } catch (error) {
      next(error);
    }
  };

  public logIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = pick(req.body);
      const loginUserData: { findUser: User, tokenData: string } | string = await this.auth.login(req.body);
      if (loginUserData?.findUser) return res.status(200).json({ message: "User Logged in", data: { user: loginUserData?.findUser, token: loginUserData?.tokenData } });
      else return res.status(401).json({ message: loginUserData });
    } catch (error) {
      next(error);
    }
  };

  public socialLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = pick(req.body);
      const data = await this.auth.googleSingIn(req.body);
      return res.status(200).json({ message: "User Logged in", data });
    } catch (error) {
      next(error);
    }
  };

  public adminLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = pick(req.body);
      const loginUserData: object = await this.auth.adminLogin(req.body);
      res.status(200).json({ data: loginUserData, message: "Admin Login Success" });
    } catch (error) {
      next(error);
    }
  };

  public forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = req.body;
      const forgotPasswordUserData: User = await this.auth.forgotPassword(req.body);
      res.status(200).json({ message: "Mail Sent for the forogt Password" });
    } catch (error) {
      next(error);
    }
  };

  public verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userData: User = req.body;
      const verifyEmailUserData = await this.auth.verifyuserToken(userData.verifyToken);
      res.status(200).json({ data: verifyEmailUserData, message: "Verification Success" });
    } catch (error) {
      next(error);
    }
  }

  public checkLogggedIn(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user && req.user.isActive === true) return res.status(200).send('true');
      return res.status(200).send('false');
    } catch (error) {
      next(error);
    }
  }

  public logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.auth.logout(req.user);
      return res.status(200).json({ message: "User Logged out" });
    } catch (error) {
      next(error);
    }
  }

  public resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.auth.resetPassword(req.body);
      res.status(200).json({ message: "Reset Password successfully" });
    } catch (error) {
      next(error);
    }
  };
}
