import { Product } from '@models/Product.model';
import ProductInterface from '@interfaces/Product.interface';
import { Service } from 'typedi';
import { StoreModel } from '@/models/Store.model';
import { HttpException } from '@/exceptions/httpException';
import { SubCategory } from '@/models/SubCategory.model';
import { Category } from '@/models/Category.model';


@Service()
class ProductService {

    public async createProduct(userId: string, productData: ProductInterface): Promise<ProductInterface> {


        const checkStore = await StoreModel.findOne({ _id: productData.storeId, userId: userId, isActive: true, status: 'approved' })
        console.log("checkStore", checkStore)
        if (!checkStore) {
            throw new HttpException(400, 'Invalid storeId or you are not authorized to manage this store');
        }

        const checkSubCategory = await SubCategory.findOne({ _id: productData.subCategoryId, userId })
        if (!checkSubCategory) {
            throw new HttpException(400, 'Invalid subCategoryId')
        }

        const checkName = await Product.find({ name: productData.name })
        if (checkName.length > 0) {
            throw new HttpException(400, 'Product name already exists');
        }
        const newProduct = await Product.create({ ...productData, userId });
        return newProduct;
    }

    public getAllProducts = async (): Promise<ProductInterface[]> => {
        return Product.find();
    };

    public getAllProductsGrouped = async (): Promise<any[]> => {
        const categories = await Category.find();

        const result = [];

        for (let category of categories) {

            const subCategories = await SubCategory.find({ categoryId: category._id });

            const subCategoryProducts = [];

            for (let subCategory of subCategories) {

                const products = await Product.find({ subCategoryId: subCategory._id });

                subCategoryProducts.push({
                    subCategory: subCategory.name,
                    products: products,
                });
            }

            result.push({
                category: category.name,
                subCategories: subCategoryProducts,
            });
        }

        return result;
    };



    public async getProductById(productId: string): Promise<ProductInterface | null> {
        return await Product.findById(productId);
    }

    public async updateProduct(productId: string, productData: ProductInterface): Promise<ProductInterface | null> {
        return await Product.findByIdAndUpdate(productId, productData, { new: true });
    }

    public async deleteProduct(productId: string): Promise<void> {
        await Product.findByIdAndDelete(productId);
    }
}

export default ProductService;
