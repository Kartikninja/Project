import { Product } from '@models/Product.model';
import ProductInterface from '@interfaces/Product.interface';
import { Service } from 'typedi';
import { StoreModel } from '@/models/Store.model';
import { HttpException } from '@/exceptions/httpException';
import { SubCategory } from '@/models/SubCategory.model';
import { Category } from '@/models/Category.model';


@Service()
class ProductService {

    public async createProduct(storeId: string, productData: ProductInterface): Promise<ProductInterface> {


        const checkStore = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' })
        if (!checkStore) {
            throw new HttpException(400, 'Invalid storeId or you are not authorized to manage this store');
        }

        const checkSubCategory = await SubCategory.findOne({ _id: productData.subCategoryId })
        if (!checkSubCategory) {
            throw new HttpException(400, 'Invalid subCategoryId')
        }

        const checkName = await Product.find({ name: productData.name })
        if (checkName.length > 0) {
            throw new HttpException(400, 'Product name already exists');
        }
        const newProduct = await Product.create({ ...productData, storeId });
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

    public async updateProduct(storeId: string, productId: string, productData: ProductInterface): Promise<ProductInterface | null> {

        const product = await Product.findOne({ _id: productId, storeId: storeId });
        if (!product) {
            throw new HttpException(404, 'Product not found with this store');
        }
        if (productData.subCategoryId) {
            const checkSubCategory = await SubCategory.findOne({ _id: productData.subCategoryId, storeId: storeId });
            if (!checkSubCategory) {
                throw new HttpException(400, 'Invalid subCategoryId');
            }
        }
        if (productData.name && productData.name !== product.name) {
            const existingProduct = await Product.findOne({ name: productData.name });
            if (existingProduct) {
                throw new HttpException(400, 'Product name already exists');
            }
        }

        product.name = productData.name || product.name;
        product.description = productData.description || product.description;
        product.price = productData.price || product.price;
        product.stockQuantity = productData.stockQuantity || product.stockQuantity;
        product.stockLeft = productData.stockLeft || product.stockLeft;
        product.images = productData.images || product.images;
        product.subCategoryId = productData.subCategoryId || product.subCategoryId;
        product.updatedAt = new Date();
        await product.save();

        return product;
    }

    public async deleteProduct(storeId: string, productId: string) {

        const deleteProduct = await Product.findByIdAndDelete({ _id: productId, storeId: storeId });
        if (!deleteProduct) {
            throw new HttpException(404, 'Product not found with this store');
        }
        return deleteProduct;
    }
}

export default ProductService;
