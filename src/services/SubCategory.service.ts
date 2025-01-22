import { HttpException } from '@/exceptions/httpException';
import { SubCategoryInterface } from '@/interfaces/SubCategory.interface';
import { Category } from '@/models/Category.model';
import { StoreModel } from '@/models/Store.model';
import { SubCategory } from '@/models/SubCategory.model';
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

        return subCategories;
    }






    public async deleteSubCategory(storeId: string, id: string): Promise<void> {
        const deletedSubCategory = await SubCategory.findByIdAndDelete({ _id: id, storeId: storeId });
        if (!deletedSubCategory) {
            throw new Error('SubCategory not found');
        }
    }


    public async getSubCategoriesGroupedByCategory(): Promise<any> {
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



}

export default SubCategoryService;
