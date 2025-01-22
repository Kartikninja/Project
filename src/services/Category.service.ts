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
        const checkStore = await StoreModel.findOne({ _id: categoryData.storeId, status: 'approved', isActive: true })
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

    public async updateCategory(storeId: string, categoryId: string, categoryData: Partial<CategoryInterface>): Promise<CategoryInterface | null> {
        const checkStore = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' })
        if (!checkStore) {
            throw new HttpException(404, 'Store not found or store is not active');
        }
        const updatedCategory = await Category.findOne({ _id: categoryId, storeId: storeId });
        if (!updatedCategory) throw new Error('Category not found');
        updatedCategory.name = categoryData.name || updatedCategory.name;
        updatedCategory.description = categoryData.description || updatedCategory.description;
        updatedCategory.images = categoryData.images || updatedCategory.images;


        await updatedCategory.save();

        return updatedCategory;
    }

    public async deleteCategory(storeId: string, categoryId: string): Promise<CategoryInterface | null> {
        const checkStore = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' })
        if (!checkStore) {
            throw new HttpException(404, 'Store not found or store is not active');
        }
        const deletedCategory = await Category.findByIdAndDelete({ _id: categoryId, storeId: storeId });
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
