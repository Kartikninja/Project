import { uploadToS3 } from '@/utils/utils';
import { HttpException } from '@exceptions/httpException';
import { User } from '@interfaces/users.interface';
import { UserModel } from '@models/users.model';
import { hash, compare } from 'bcrypt';
import Container, { Service } from 'typedi';
import { redisClient } from '../utils/redisClient'
import { NotificationService } from './Notification.service';


@Service()
export class UserService {
  private notificationService = Container.get(NotificationService)
  private static cacheKey = 'all_users';
  public async findUserById(userId: string): Promise<User> {
    const findUser: User = await UserModel.findOne({ _id: userId, isActive: true }).lean();
    delete findUser.password
    if (!findUser) throw new HttpException(409, "User doesn't exist");
    return findUser;
  }

  public async updateUser(userId: string, userData: User): Promise<User> {
    const { email, password, profileImage } = userData;
    if (email) {
      const findUser: User = await UserModel.findOne({ email });
      if (findUser && findUser._id != userId) throw new HttpException(409, `Email already exists`);
    }

    if (password) {
      const hashedPassword = await hash(userData.password, 10);
      userData = { ...userData, password: hashedPassword };
    }

    if (profileImage) userData.profileImage = await this.uploadImage(profileImage)
    const updateUserById: User = await UserModel.findByIdAndUpdate(userId, userData, { new: true });
    if (!updateUserById) throw new HttpException(409, "User doesn't exist");
    const io = await this.notificationService.getIO()
    io.to('user-admin-room').emit('nootification', {
      modelName: 'User',
      id: updateUserById._id,
      message: `${updateUserById.fullName}'s profile has been updated`,
      type: "Update-Profile",
      createdBy: 'User'
    })

    await this.notificationService.sendAdminNotification(
      'User',
      `${updateUserById.fullName}'s profile has been updated`,
      'User-Update-Profile',
      'User',
      updateUserById._id
    )

    return updateUserById;
  }


  public async listUsers(params): Promise<User> {
    const { limit, skip } = params;


    const paginate = [];
    if (limit) paginate.push({ $skip: skip }, { $limit: limit });

    const findUser: User[] = await UserModel.aggregate([
      {
        $facet: {
          data: paginate,
          total: [{ $count: 'total' }],
        },
      },
    ]);
    console.log("findUser", findUser)
    console.log("Serving from DB");

    return findUser[0];
  }

  public async deleteUser(userId: string): Promise<Boolean> {
    const deleteUserById: Boolean = await UserModel.findByIdAndDelete(userId);
    if (!deleteUserById) throw new HttpException(409, "User doesn't exist");
    const io = await this.notificationService.getIO()
    io.to('user-admin-room').emit('notification', {
      modelName: 'User',
      message: `User with id ${userId} has been deleted`,
      id: userId,
      type: "Delete-User",
      createdBy: 'User'
    })



    await this.notificationService.sendAdminNotification(
      'User',
      `User with id ${userId} has been deleted`,
      "Delete-User",
      'User',
      userId
    )

    return true;
  }

  public async uploadImage(file) {
    const folderName = 'user-profile'
    const fileName = `${Math.ceil(Date.now() * Math.random())}.jpg`
    const data = await uploadToS3(file.buffer, folderName, fileName);
    return data.Location;
  };

  public async resetPasswrod(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const findUser: User = await UserModel.findOne({ _id: userId });
    if (!findUser) throw new HttpException(409, "User doesn't exist");
    const data = await compare(oldPassword, findUser.password)
    if (!data) throw new HttpException(409, "Old password is incorrect");
    const hashedPassword = await hash(newPassword, 10);
    await UserModel.findByIdAndUpdate(userId, { password: hashedPassword })
    return true
  }

}