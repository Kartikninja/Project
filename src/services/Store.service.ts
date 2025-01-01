import { StoreModel } from "@/models/Store.model";
import { Service } from "typedi";
import { StoreDocument } from '@interfaces/Store.interface'
import { UserModel } from "@/models/users.model";
import { HttpException } from "@/exceptions/httpException";
import { USER_ROLES } from "@/utils/constant";


@Service()
export class StoreService {

    public async createStore(userId: string, storeData: StoreDocument) {
        const checkName = await StoreModel.find({ storeName: storeData.storeName, userId })
        if (checkName.length > 0) {
            throw new HttpException(400, "Store name already exists");
        }
        const checkUser = await UserModel.findById(userId);

        const store = await StoreModel.create({ ...storeData, userId: userId });

        await UserModel.findByIdAndUpdate(userId, { $push: { storesIds: store._id } })

        const populatedUser = await UserModel.findById(storeData.userId)
            .populate('storesIds');

        return store;
    }



    public async getAll() {
        const result = await StoreModel.find()
        return result
    }
    public async getById(id: string) {
        const result = await StoreModel.findById(id)
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

