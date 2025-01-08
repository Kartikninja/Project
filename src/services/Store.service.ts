import { StoreModel } from "@/models/Store.model";
import { Service } from "typedi";
import { StoreDocument } from '@interfaces/Store.interface'
import { UserModel } from "@/models/users.model";
import { HttpException } from "@/exceptions/httpException";
import { USER_ROLES } from "@/utils/constant";
import { compare, hash } from "bcrypt";
import crypto from 'crypto';
import bcrypt from 'bcryptjs'
import { sendForgotPasswordEmail, sendOtpEmail, sendWelcomEmail } from "@/utils/mailer";
import { FRONT_END_URL, SECRET_KEY } from "@/config";
import { sign, verify } from 'jsonwebtoken';
import { DataStoredInToken, TokenData } from "@/interfaces/auth.interface";




const createToken = (user: StoreDocument): TokenData => {
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
export class StoreService {

    public async createStore(storeData: Partial<StoreDocument>) {
        const emailExists = await StoreModel.findOne({ email: storeData.email, isActive: true });
        const phoneExits = await StoreModel.findOne({ phoneNumber: storeData.phoneNumber, isActive: true })
        if (emailExists || phoneExits) {
            throw new HttpException(400, 'Email or phone already associated with another store');
        } else {
            storeData.password = await hash(storeData.password, 10);
            storeData.email = storeData.email.toLowerCase()
            const otp = crypto.randomInt(100000, 999999).toString()
            const hashedOtp = await bcrypt.hash(otp, 10)
            const otpExpiration = new Date(Date.now() + 10 * 60 * 1000);
            console.log("otp", otp)
            const createStoreData: StoreDocument = await StoreModel.create({
                ...storeData,
                verifyToken: hashedOtp,
                verificationTokenExpiresAt: otpExpiration,
                isVerified: false,
                role: 3
            })
            try {
                await sendOtpEmail(storeData.email, otp, storeData.fullName);
            } catch (error) {
                throw new HttpException(500, 'Failed to send OTP email');
            }
            const tokenData = await createToken(createStoreData).token
            await StoreModel.updateOne({ _id: createStoreData._id }, { token: tokenData })
            return { Store: createStoreData, token: tokenData }
        }

    }


    public async verifyOtp(email: string, otp: string) {
        try {
            const user = await StoreModel.findOne({ email: email });
            console.log(user)
            console.log("OTP Expiry:", user.verificationTokenExpiresAt);


            if (!user.verificationTokenExpiresAt || new Date() > new Date(user.verificationTokenExpiresAt)) {
                throw new HttpException(400, 'OTP has expired');
            }
            console.log("user.verifyToken", user.verifyToken)
            const isOtpVerify = await bcrypt.compare(otp, user.verifyToken);
            console.log("isOtpVerify", isOtpVerify)
            if (!isOtpVerify) {
                throw new HttpException(400, 'Invalid OTP');
            }
            user.isVerified = true;
            user.verifyToken = '';
            user.verificationTokenExpiresAt = null;
            await user.save();
            await sendWelcomEmail(user.email, user.fullName);

            return user;
        } catch (error) {
            throw new HttpException(400, 'Invalid OTP');
        }
    }



    public async login(SotreData: StoreDocument): Promise<{ findUser: StoreDocument, tokenData: string }> {
        const { email, password } = SotreData

        const findUser: StoreDocument = await StoreModel.findOne({ email, isVerified: true })
        if (!findUser) throw new HttpException(401, `Email Does not Exist, Please Sing Up`);
        if (!findUser.password) throw new HttpException(401, `You are logged-in via social platform. Please login in with your social account`);
        if (!findUser.isVerified) throw new HttpException(401, `User is not verified. Please verify your email to log in.`);

        const data = await compare(password, findUser.password)
        if (!data) throw new HttpException(409, `Invalid Password`);
        else {
            const tokenData = await createToken(findUser).token;
            await StoreModel.updateOne({ _id: findUser._id }, { token: tokenData })
            delete findUser.password
            delete findUser.token
            return { findUser, tokenData };
        }
    }


    public async forgotPassword(storeData: StoreDocument): Promise<StoreDocument> {
        const store: StoreDocument = await StoreModel.findOne({ email: storeData.email })
        if (!store) throw new HttpException(400, "Email Does not Exist")
        store.token = null;
        store.resetPasswordTokenExpiresAt = null;
        const token = await createToken(store).token
        store.token = token
        console.log('resetToken', token)
        store.resetPasswordTokenExpiresAt = new Date(Date.now() + 3600000)
        await store.save()
        const link = `${FRONT_END_URL}/reset-password/${token}`
        await sendForgotPasswordEmail(store.email, store.fullName, link)
        return store

    }

    public async verifyToken(token: string): Promise<{ findUser: StoreDocument, tokenData: string }> {
        const findUser: StoreDocument = await StoreModel.findOne({ token: token })
        if (!findUser) throw new HttpException(400, 'Invalid Token')
        const tokenData = await createToken(findUser).token;
        return { findUser, tokenData }
    }

    public async resetPassword(token: string, password: string): Promise<StoreDocument> {

        const decoded = verifyToken(token);
        const { email } = decoded;
        const store = await StoreModel.findOne({ email });
        if (!store) throw new HttpException(409, "Store doesn't exist");
        const hashedPassword = await hash(password, 10);
        const updatedUser = await StoreModel.findByIdAndUpdate(store._id, { password: hashedPassword }, { new: true });
        return updatedUser;
    }




    public async getAll() {
        const result = await StoreModel.find({ isActive: true })
        return result
    }
    public async getById(id: string) {
        const result = await StoreModel.findOne({ _id: id, isActive: true })
        if (!result) {
            throw new HttpException(404, "Store not found")
        }
        return result
    }

    public async delete(id: string) {

        const result = await StoreModel.findById(id);

        if (!result) {
            console.log('Store not found');
            throw new Error('Store not found');
        }
        await StoreModel.findByIdAndDelete(id);

        await UserModel.updateMany(
            { storesIds: id },
            { $pull: { storesIds: id } }
        );

        console.log(`Removed store ${result.storeName} from userModel storesIds`);

        return result
    }

    public async updateStore(storeId: string, storeData: StoreDocument) {

        const existingData = await StoreModel.findById(storeId)
        if (!existingData) {
            throw new HttpException(404, "Store not found")
        }
        const checkName = await StoreModel.find({ storeName: storeData.storeName, _id: { $ne: storeId } })
        if (checkName.length > 0) {
            throw new HttpException(400, "Store name already exists")
        }

        const updatedStore = await StoreModel.findByIdAndUpdate(
            storeId,
            { $set: storeData },
            { new: true }
        )
        if (!updatedStore) {
            throw new HttpException(404, "Store not found")
        }
        return updatedStore
    }


    public async approveStore(storeId: string): Promise<StoreDocument> {

        const store = await StoreModel.findById(storeId);

        if (!store) {
            throw new HttpException(404, 'Store not found');
        }

        if (store.status === 'approved') {
            throw new HttpException(400, 'Store is already approved');
        }

        store.status = 'approved';
        store.updatedAt = new Date();

        const updatedStore = await store.save();

        return updatedStore;
    }

    public async rejectStore(storeId: string): Promise<StoreDocument> {
        const store = await StoreModel.findById(storeId);

        if (!store) {
            throw new HttpException(404, 'Store not found');
        }

        if (store.status === 'rejected') {
            throw new HttpException(400, 'Store is already rejected');
        }

        store.status = 'rejected';
        store.updatedAt = new Date();

        const updatedStore = await store.save();
        return updatedStore;
    }




    public async getNearbyStores(userId: string, maxDistance: number, page: number, limit: number) {
        const user = await UserModel.findById(userId);
        if (!user || !user.currentLocation) {
            throw new Error('User location not found');
        }

        const skip = (page - 1) * limit;

        const userCoordinates: [number, number] = user.currentLocation.coordinates as [number, number];
        console.log("userCoordinates", userCoordinates)
        const nearbyStores = await StoreModel.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [userCoordinates[0], userCoordinates[1]] },
                    distanceField: 'distance',
                    maxDistance: maxDistance,
                    query: { isActive: true, status: 'approved' },
                    spherical: true,
                },
            },
            { $skip: skip },
            { $limit: limit },
        ]);


        const totalStores = await StoreModel.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [userCoordinates[0], userCoordinates[1]] },
                    distanceField: 'distance',
                    maxDistance: maxDistance,
                    query: { isActive: true, status: 'approved' },
                    spherical: true,
                },
            },
            { $count: "totalStores" },
        ]);

        return {
            nearbyStores,
            totalStores: totalStores.length ? totalStores[0].totalStores : 0,
            currentPage: page,
            totalPages: Math.ceil((totalStores.length ? totalStores[0].totalStores : 0) / limit),
        };
    }



}

