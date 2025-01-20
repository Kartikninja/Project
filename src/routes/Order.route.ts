import { Router } from 'express';
import OrderController from '@controllers/Order.controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

class OrderRouter {
    public path = '/orders';
    public router = Router();
    private orderController = new OrderController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}`, AuthMiddleware, this.orderController.createOrder);
        this.router.get(`${this.path}/:id`, AuthMiddleware, this.orderController.getOrderById);
        this.router.get(`${this.path}`, AuthMiddleware, this.orderController.getAllOrders);
        this.router.delete(`${this.path}/:id`, AuthMiddleware, this.orderController.deleteOrder);
        this.router.put(`${this.path}/update/status`, AuthMiddleware, this.orderController.updateOrderStatus)
        this.router.put(`${this.path}/updateOrder/:orderId`, AuthMiddleware, this.orderController.updateOrder)

    }
}

export default OrderRouter;
