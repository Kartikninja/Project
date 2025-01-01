import { Request, Response, NextFunction } from 'express';
import OrderService from '@services/Order.service';
import Container from 'typedi';

class OrderController {
    private orderService = Container.get(OrderService);

    public createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { _id: userId } = req.user;
            const userRole = req.user.role
            if (userRole !== 1) {
                res.status(403).json({ message: 'You are not authorized to create an order' })
            }
            const orderData = req.body;
            const { order, payment } = await this.orderService.createOrder(userId, orderData);
            res.status(201).json({ data: order, paymentDetails: payment, message: 'Order created successfully' });
        } catch (error) {
            next(error);
        }
    };

    public getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const order = await this.orderService.getOrderById(id);
            res.status(200).json({ data: order, message: 'Order retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };

    public getAllOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { _id: userId } = req.user; // Filter orders for the logged-in user
            const orders = await this.orderService.getAllOrders(userId);
            res.status(200).json({ data: orders, message: 'Orders retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };

    public deleteOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            await this.orderService.deleteOrder(id);
            res.status(200).json({ message: 'Order deleted successfully' });
        } catch (error) {
            next(error);
        }
    };
}

export default OrderController;
