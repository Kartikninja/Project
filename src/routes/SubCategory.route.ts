import { Router } from 'express';
import SubCategoryController from '@/controllers/SubCategory.controller';
import { AuthMiddleware } from '@middlewares/auth.middleware';

class SubCategoryRoute {
    public path = '/subcategories';
    public router = Router();
    public subCategoryController = new SubCategoryController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}`, AuthMiddleware, this.subCategoryController.createSubCategory);
        this.router.get(`${this.path}`, AuthMiddleware, this.subCategoryController.getAllSubCategories);
        this.router.delete(`${this.path}/:id`, AuthMiddleware, this.subCategoryController.deleteSubCategory);
        this.router.get(`${this.path}/getAll/category`, this.subCategoryController.getSubCategoriesGroupedByCategory)

    }
}

export default SubCategoryRoute;
