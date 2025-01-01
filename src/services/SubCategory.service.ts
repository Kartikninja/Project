import { HttpException } from '@/exceptions/httpException';
import { Category } from '@/models/Category.model';
import { SubCategory } from '@/models/SubCategory.model';
import { Service } from 'typedi';


@Service()
class SubCategoryService {
    public async createSubCategory(userId: string, subCategoryData: any): Promise<any> {
        const checkName = await SubCategory.findOne({ name: subCategoryData.name })
        if (checkName) {
            throw new HttpException(404, 'SubCategory Name Already Exit')
        }
        const checkCategory = await Category.findOne({ _id: subCategoryData.categoryId, userId: userId })
        if (!checkCategory) {
            throw new HttpException(404, 'Category Not Found with this user')
        }

        const subCategory = await SubCategory.create({ ...subCategoryData, userId });
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






    public async deleteSubCategory(id: string): Promise<void> {
        const deletedSubCategory = await SubCategory.findByIdAndDelete(id);
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

}

export default SubCategoryService;
