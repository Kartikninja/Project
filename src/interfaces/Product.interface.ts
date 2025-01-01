import { Document } from 'mongoose';

interface ProductInterface extends Document {
    name: string;
    description: string;
    price: number;
    stockQuantity: number;
    images: string[];
    storeId: string;
    createdAt: Date;
    updatedAt: Date;
    stockLeft: number;
    subCategoryId: string
    userId: string
}

export default ProductInterface;
