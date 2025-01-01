
import { ProductVariant } from '@models/ProductVariant.model';
import { Product } from '@models/Product.model';
import { Category } from '@models/Category.model';
import { SubCategory } from '@models/SubCategory.model';
import { Service } from 'typedi';
import { HttpException } from '@/exceptions/httpException';
import { StoreModel } from '@/models/Store.model';


@Service()
export class ProductVariantService {
    public async createProductVariant(userId: string, productVariantData: any) {
        const { productId, attributes } = productVariantData
        if (!attributes || (!attributes.size && !attributes.color && !attributes.material)) {
            throw new HttpException(400, 'At least one of size, color, or material must be provided');
        }
        const checkName = await ProductVariant.findOne({
            productId, 'attributes.size': attributes.size, 'attributes.color': attributes.color, 'attributes.material': attributes.material
        })
        if (checkName) {
            throw new HttpException(400, 'This Variant already exists');
        }

        const checkProduct = await Product.findOne({ _id: productVariantData.productId, userId: userId, storeId: productVariantData.storeId })
        if (!checkProduct) {
            throw new HttpException(404, 'Product not found')
        }

        const checkStore = await StoreModel.findOne({ _id: productVariantData.storeId, userId: userId, isActive: true, status: 'approved' })
        if (!checkStore) {
            throw new HttpException(404, 'Store not found')
        }

        const newProductVariant = await ProductVariant.create({ ...productVariantData, userId });
        return newProductVariant;
    }


    public async getAllProductVariants() {
        const productVariants = await ProductVariant.aggregate([
            {
                $lookup: {
                    from: 'Products',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            {
                $unwind: '$product',
            },
            {
                $lookup: {
                    from: 'subcategories',
                    localField: 'product.subCategoryId',
                    foreignField: '_id',
                    as: 'subCategory',
                },
            },
            {
                $unwind: '$subCategory',
            },
            {
                $lookup: {
                    from: 'Categories',
                    localField: 'subCategory.categoryId',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            {
                $unwind: '$category',
            },
            {
                $group: {
                    _id: {
                        categoryId: '$category._id',
                        categoryName: '$category.name',
                        subCategoryId: '$subCategory._id',
                        subCategoryName: '$subCategory.name',
                        productId: '$product._id',
                        productName: '$product.name',
                    },
                    categoryName: { $first: '$category.name' },
                    subCategoryName: { $first: '$subCategory.name' },
                    products: {
                        $push: {
                            variantId: '$_id',
                            variantName: '$variantName',
                            variantValue: '$variantValue',
                            price: '$price',
                            stockQuantity: '$stockQuantity',
                            stockLeft: '$stockLeft',
                            images: '$images',
                        },
                    },
                },
            },
            {
                $group: {
                    _id: {
                        categoryId: '$_id.categoryId',
                        categoryName: '$_id.categoryName',
                        subCategoryId: '$_id.subCategoryId',
                        subCategoryName: '$_id.subCategoryName',
                    },
                    products: {
                        $push: {
                            productId: '$_id.productId',
                            productName: '$_id.productName',
                            variants: '$products',
                        },
                    },
                },
            },
            {
                $group: {
                    _id: {
                        categoryId: '$_id.categoryId',
                        categoryName: '$_id.categoryName',
                    },
                    subcategories: {
                        $push: {
                            subCategoryId: '$_id.subCategoryId',
                            subCategoryName: '$_id.subCategoryName',
                            products: '$products',
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    categoryId: '$_id.categoryId',
                    categoryName: '$_id.categoryName',
                    subcategories: 1,
                },
            },
            {
                $sort: { categoryName: 1 },
            },
        ]);

        return productVariants;
    }






    public async getProductVariantById(id: string) {
        const productVariant = await ProductVariant.findById(id).populate('productId').populate('productId.subCategoryId').populate('productId.subCategoryId.categoryId');
        return productVariant;
    }

    public async updateProductVariant(id: string, productVariantData: any) {
        const updatedProductVariant = await ProductVariant.findByIdAndUpdate(id, productVariantData, { new: true });
        return updatedProductVariant;
    }

    public async deleteProductVariant(id: string) {
        await ProductVariant.findByIdAndDelete(id);
    }
}



