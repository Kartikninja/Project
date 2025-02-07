import { HttpException } from '@/exceptions/httpException';
import { SubCategoryInterface } from '@/interfaces/SubCategory.interface';
import { Category } from '@/models/Category.model';
import { StoreModel } from '@/models/Store.model';
import { SubCategory } from '@/models/SubCategory.model';
import { redisClient } from '@/utils/redisClient';
import { FilterQuery } from 'mongoose';
import { Service } from 'typedi';


@Service()
class SubCategoryService {
    public async createSubCategory(storeId: string, subCategoryData: any): Promise<any> {
        const checkName = await SubCategory.findOne({ name: subCategoryData.name })
        if (checkName) {
            throw new HttpException(404, 'SubCategory Name Already Exit')
        }
        const checkCategory = await Category.findOne({ _id: subCategoryData.categoryId, storeId: storeId })
        if (!checkCategory) {
            throw new HttpException(404, 'Category Not Found with this user')
        }

        const subCategory = await SubCategory.create({ ...subCategoryData, storeId });
        return subCategory;
    }

    public async getAllSubCategories(): Promise<any> {

        const catchKey = `getAllSubcategory`
        const cachedData = await redisClient.get(catchKey)
        if (cachedData) {
            console.log("Data is catch from redis")
            return JSON.parse(cachedData)
        }
        console.log('Cache miss. Fetching from MongoDB...');



        const subCategories = await SubCategory.aggregate([
            {
                $lookup: {
                    from: 'Categories',
                    localField: 'categoryId',
                    foreignField: '_id',
                    as: 'categoryInfo',
                },
            },
            {
                $unwind: '$categoryInfo',
            },
            {
                $lookup: {
                    from: 'Users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userInfo',
                },
            },
            {
                $unwind: '$userInfo',
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    images: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    'categoryInfo._id': 1,
                    'categoryInfo.name': 1,
                    'userInfo._id': 1,
                    'userInfo.fullName': 1,
                    'userInfo.email': 1,
                },
            },
        ]);

        await redisClient.set(catchKey, JSON.stringify(subCategories), 'EX', 3600)
        return subCategories;

    }






    public async deleteSubCategory(storeId: string, id: string): Promise<void> {
        const deletedSubCategory = await SubCategory.findByIdAndDelete({ _id: id, storeId: storeId });
        if (!deletedSubCategory) {
            throw new Error('SubCategory not found');
        }
    }


    public async getSubCategoriesGroupedByCategory(): Promise<any> {
        const catchKey = `getSubcategoryGrouped`
        const cachedData = await redisClient.get(catchKey)
        if (cachedData) {
            console.log("Data is catch from redis")
            return JSON.parse(cachedData)
        }
        console.log('Cache miss. Fetching from MongoDB...');


        const groupedSubCategories = await SubCategory.aggregate([
            {
                $lookup: {
                    from: 'Categories',
                    localField: 'categoryId',
                    foreignField: '_id',
                    as: 'categoryInfo',
                },
            },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: '$categoryId',
                    categoryName: { $first: '$categoryInfo.name' },
                    subCategories: {
                        $push: {
                            _id: '$_id',
                            name: '$name',
                            description: '$description',
                            images: '$images',
                            createdAt: '$createdAt',
                            updatedAt: '$updatedAt',
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    categoryId: '$_id',
                    categoryName: 1,
                    subCategories: 1,
                },
            },
        ]);
        await redisClient.set(catchKey, JSON.stringify(groupedSubCategories), 'EX', 3600)

        return groupedSubCategories;
    }


    public async updateSubcategory(storeId: string, id: string, subCategorydata: SubCategoryInterface) {
        const checkStore = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' })
        if (!checkStore) {
            throw new HttpException(404, 'Store not found');
        }
        const subCategory = await SubCategory.findOne({ _id: id, storeId: storeId })
        if (!subCategory) {
            throw new HttpException(404, 'SubCategory not found');
        }

        if (subCategorydata.categoryId) {
            const checkCategory = await Category.findOne({ _id: subCategory.categoryId, storeId: storeId })
            if (!checkCategory) {
                throw new HttpException(404, 'Category not found');
            }
        }

        subCategory.name = subCategorydata.name || subCategory.name;
        subCategory.description = subCategorydata.description || subCategory.description;
        subCategory.images = subCategorydata.images || subCategory.images;
        subCategory.categoryId = subCategorydata.categoryId || subCategory.categoryId;


        await subCategory.save();

        return subCategory;


    }





    public async searchSubCategory(queryParams: any) {
        const { search, categoryId, storeId, minPrice, maxPrice, sortBy, sortOrder, page = 1, limit = 10 } = queryParams;

        let filter: FilterQuery<typeof SubCategory> = {}
        if (search) {
            filter.$text = { $search: search }
        }
        if (categoryId) filter.categoryId = categoryId
        if (storeId) filter.storeId = storeId

        if (minPrice || maxPrice) {
            filter.price = {}
            if (minPrice) filter.price.$gte = minPrice
            if (maxPrice) filter.price.$lte = maxPrice

        }

        let sortOptions: any = {}
        if (sortBy) {
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1
        } else {
            sortOptions.createdAt = -1
        }

        const skip = (page - 1) * limit

        const catchKey = `search:${JSON.stringify(queryParams)}`
        const cachedData = await redisClient.get(catchKey)
        if (cachedData) {
            console.log("Data is catch from redis")
            return JSON.parse(cachedData)
        }
        console.log('Cache miss. Fetching from MongoDB...');

        const products = await SubCategory.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))

        const totalCount = await SubCategory.countDocuments(filter)

        const result = {
            products,
            totalCount,
            currentPage: page,
            totalPage: Math.ceil(totalCount / limit)
        }
        await redisClient.set(catchKey, JSON.stringify(result), 'EX', 3600)
        return result



    }

}

export default SubCategoryService;
