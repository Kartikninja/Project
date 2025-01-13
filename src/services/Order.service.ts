import Container, { Service } from 'typedi';
import { OrderModel } from '@models/Order.model';
import { StoreModel } from '@/models/Store.model';
import { HttpException } from '@/exceptions/httpException';
import { UserModel } from '@/models/users.model';
import { Product } from '@/models/Product.model';
import { ProductVariant } from '@/models/ProductVariant.model';
import { PaymentService } from './Paymnet.Service';
import { DiscountModel } from '@/models/Discount.model';
import { Discount_TYPE } from '@/utils/constant';
import { SubCategory } from '@/models/SubCategory.model';
import { NotificationService } from './Notification.service';



@Service()
class OrderService {

    private payment = Container.get(PaymentService)
    private notification = Container.get(NotificationService)


    public async createOrder(userId: string, orderData: any): Promise<any> {
        const { storeId, products, shippingAddress, discountCode } = orderData;

        console.log("orderData", orderData)
        const store = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' });
        if (!store) throw new HttpException(404, 'This Store is not found');

        const user = await UserModel.findOne({ _id: userId, isVerified: true });
        if (!user) throw new HttpException(404, 'User not found or not verified');

        try {
            let totalPrice = 0;

            for (const product of products) {
                const { productId, productVariantId, quantity } = product;


                const productData = await Product.findById(productId);
                if (!productData) throw new HttpException(404, 'This Product is not found');

                const productVariant = await ProductVariant.findOne({ _id: productVariantId, productId });
                if (!productVariant) throw new HttpException(404, 'This Product Variant is not found');

                const subCategory = await SubCategory.findById(productData.subCategoryId);
                const variantPrice = productVariant.price || 0;


                let productDiscount = 0;
                let appliedDiscount = await this.getDiscount({
                    discountCode,
                    storeId,
                    productId,
                    subCategory,
                    quantity,
                });

                if (appliedDiscount) {
                    const { discount_type, value } = appliedDiscount;
                    productDiscount = discount_type === Discount_TYPE.PERCENTAGE
                        ? (variantPrice * value) / 100
                        : value;
                }

                const discountedPrice = (variantPrice - productDiscount) * quantity;
                totalPrice += discountedPrice;
                product.finalPrice = discountedPrice;


                if (appliedDiscount) {
                    console.log(`Discount applied for product ${productId}:`, {
                        code: appliedDiscount.code,
                        discountType: appliedDiscount.discount_type,
                        value: appliedDiscount.value,
                        productDiscount,
                    });
                }
                console.log(`Discounted price for product ${productId}: ${discountedPrice}`);
            }
            const payment = await this.payment.createRazorpayOrder(totalPrice, userId, 'razorpay', 'Order');
            console.log('payment', payment);

            const orderId = `ORD-${new Date().getTime()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const order = await OrderModel.create({
                orderId,
                userId,
                storeId,
                products,
                totalPrice,
                shippingAddress,
                orderStatus: 'pending',
                paymentStatus: 'unpaid',
                transactionId: payment.transactionId,
            });



            await this.notification.sendAdminNotification(
                'Store',
                order.id,
                `New Order Received from ${user.fullName}`,
                'success',
                'Store'
            )


            const io = this.notification.getIO()
            if (io) {
                try {
                    io.to(`store_${storeId}`).emit('notification', {
                        message: `New order from ${user.fullName}`,
                        orderId: order._id,
                        userId: userId,
                        type: 'new-order',
                    });
                    console.log(`Notification sent to store ${storeId}`);
                } catch (error) {
                    console.error('Error emitting notification:', error);
                }
            }
            return { order, payment };
        } catch (error) {
            console.error('Error creating order:', error);
            throw new HttpException(500, 'Failed to create order');
        }
    }

    private async getDiscount(params: {
        discountCode?: string;
        storeId: string;
        productId: string;
        subCategory: any;
        quantity: number;
    }) {
        const { discountCode, storeId, productId, subCategory, quantity } = params;

        const query: any = {
            storeId,
            isActive: true,
            start_date: { $lte: new Date() },
            end_date: { $gte: new Date() },
        };

        if (discountCode) {
            query.code = discountCode;
        } else {
            query.$or = [
                { productIds: { $in: [productId] } },
                { categoryIds: { $in: [subCategory.categoryId] } },
                { subcategoryIds: { $in: [subCategory._id] } },
            ];
        }

        const discount = await DiscountModel.findOne(query);
        if (discount && discount.unit && quantity >= discount.unit) {
            return discount;
        }

        return null;
    }


    public async getOrderById(orderId: string): Promise<any> {
        const order = await OrderModel.findById(orderId)
            .populate('userId', 'name email')
            .populate('storeId', 'name')
            .populate('products.productId', 'name')
            .populate('products.productVariantId', 'variantDetails');
        if (!order) throw new Error('Order not found');
        return order;
    }

    public async getAllOrders(userId: string): Promise<any> {
        const orders = await OrderModel.find({ userId })
            .populate('storeId', 'name')
            .populate('products.productId', 'name')
            .populate('products.productVariantId', 'variantDetails');
        return orders;
    }

    public async deleteOrder(orderId: string): Promise<void> {
        const result = await OrderModel.findByIdAndDelete(orderId);
        if (!result) throw new Error('Order not found or already deleted');
    }
}

export default OrderService;
