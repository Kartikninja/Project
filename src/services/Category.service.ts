import { Category } from '@models/Category.model';
import { CategoryInterface } from '@interfaces/Category.interface';
import { Service } from 'typedi';
import { HttpException } from '@/exceptions/httpException';
import { StoreModel } from '@/models/Store.model';


@Service()
export class CategoryService {
    public async createCategory(categoryData: CategoryInterface): Promise<CategoryInterface> {
        const checkName = await Category.findOne({ name: categoryData.name })
        if (checkName) {
            throw new HttpException(404, 'Category name already exists')
        }
        const checkStore = await StoreModel.findOne({ _id: categoryData.storeId, userId: categoryData.userId, status: 'approved', isActive: true })
        if (!checkStore) {
            throw new HttpException(404, 'Store not found')
        }
        const category = await Category.create(categoryData);
        return category;
    }

    public async getAllCategories(): Promise<CategoryInterface[]> {
        const categories = await Category.find();
        return categories;
    }

    public async getCategoryById(categoryId: string): Promise<CategoryInterface | null> {
        const category = await Category.findById(categoryId);
        if (!category) throw new Error('Category not found');
        return category;
    }

    public async updateCategory(categoryId: string, categoryData: Partial<CategoryInterface>): Promise<CategoryInterface | null> {
        const updatedCategory = await Category.findByIdAndUpdate(categoryId, categoryData, { new: true });
        if (!updatedCategory) throw new Error('Category not found');
        return updatedCategory;
    }

    public async deleteCategory(categoryId: string): Promise<CategoryInterface | null> {
        const deletedCategory = await Category.findByIdAndDelete(categoryId);
        if (!deletedCategory) throw new Error('Category not found');
        return deletedCategory;
    }



    public async getAllCategoriesGroupedByUserId(): Promise<any> {
        const categories = await Category.aggregate([
            {
                $group: {
                    _id: "$userId",
                    categories: {
                        $push: {
                            _id: "$_id",
                            name: "$name",
                            description: "$description",
                            images: "$images",
                            createdAt: "$createdAt",
                            updatedAt: "$updatedAt",
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: "Users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userInfo",
                },
            },
            {
                $unwind: "$userInfo",
            },
            {
                $project: {
                    // userInfo: {
                    //     _id: 1,
                    //     fullName: 1,
                    //     email: 1,
                    //     role: 1,
                    // },
                    categories: 1,
                },
            },
        ]);

        return categories;
    }

}
