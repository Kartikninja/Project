import { Router } from 'express';
import { ProductVariantController } from '@controllers/ProductVariant.controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

class ProductVariantRouter {
    public path = '/productVariants';
    public router = Router();
    private productVariantController = new ProductVariantController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}`, AuthMiddleware, this.productVariantController.createProductVariant);
        this.router.get(`${this.path}`, this.productVariantController.getAllProductVariants);
        this.router.get(`${this.path}/:id`, this.productVariantController.getProductVariantById);
        this.router.put(`${this.path}/:id`, this.productVariantController.updateProductVariant);
        this.router.delete(`${this.path}/:id`, this.productVariantController.deleteProductVariant);
    }
}

export default ProductVariantRouter;
