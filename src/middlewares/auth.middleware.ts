import { NextFunction, Response } from "express";
import { verify } from "jsonwebtoken";
import { SECRET_KEY } from "@config";
import { HttpException } from "@exceptions/httpException";
import { DataStoredInToken, RequestWithUser } from "@interfaces/auth.interface";
import { User } from "@interfaces/users.interface";
import { UserModel } from "@models/users.model";
import { USER_ROLES } from "@utils/constant";


declare global{
  namespace Express{
    interface Request{
      user: User
      file: string
    }
  }
}
const getAuthorization = (req) => {
  const header = req.header("Authorization");
  if (header) return header

  const coockie = req.cookies["Authorization"];
  if (coockie) return coockie;
  return null;
};

export const AuthMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction ) => {
  try {
    const Authorization = getAuthorization(req);
    if (Authorization) {
      const { _id } = (await verify( Authorization, SECRET_KEY )) as DataStoredInToken;
      const findUser = await UserModel.findById(_id);
      if (!findUser.token) return res.status(401).json({ message: "You are Logged Out" });
      if (findUser.token != Authorization) return res.status(401).json({ message: "Invalid or Expired Token" });
      if (findUser) {
        req.user = findUser;
        next();
      } else return res.status(401).json({ message: "Wrong authentication token" });
    } else return res.status(401).json({ message: "Authentication Token Missing" });
  } catch (error) {
      console.log(error)
      return res.status(401).json({ message: "Invalid or Expired Token" });
  }
};

export const isAdmin = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const Authorization = getAuthorization(req);

    if (Authorization) {
      const { _id, role } = (await verify(
        Authorization,
        SECRET_KEY
      )) as DataStoredInToken;

      const findUser = await UserModel.findById(_id);

      if (findUser) {
        if (role == USER_ROLES.ADMIN) {
          req.user = findUser;
          next();
        } else {
          next(new HttpException(401, "permission denied"));
        }
      } else {
        next(new HttpException(401, "Wrong authentication token"));
      }
    } else {
      next(new HttpException(404, "Authentication token missing"));
    }
  } catch (error) {
    next(new HttpException(401, "Wrong authentication token"));
  }
};
