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
import { sendOrderUpdateEmail, sendPurchaseEmail, sendStatusUpdateEmail } from '@/utils/mailer';
import { CartItem, DiscountAttributes } from '@/interfaces/Discount.interface';
import { RazorpayService } from './razorpay.service';
import { razorpayInstance } from '@/controllers/Payment.controller';
import { Order } from '@/interfaces/Order.interface';



@Service()
class OrderService {

    private payment = Container.get(PaymentService)
    private notification = Container.get(NotificationService)
    private razorpayService = Container.get(RazorpayService)

    public async createOrder(userId: string, orderData: any): Promise<any> {
        const { storeId, products, shippingAddress, discountCode } = orderData;

        console.log("orderData", orderData)
        const store = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' });
        if (!store) throw new HttpException(404, 'This Store is not found');

        const user = await UserModel.findOne({ _id: userId, isVerified: true });
        if (!user) throw new HttpException(404, 'User not found or not verified');

        try {
            let totalPrice = 0;
            const createOrder = []
            const calculateDiscountedPrice = async (discountCode: string, productId: string, variantId: string, quantity: number, currentPrice: number) => {
                const cartItem = [{
                    Product_id: productId,
                    quantity: quantity,
                    variant: { price: currentPrice },
                    discountCode: discountCode
                }]

                let finalPrice = currentPrice * quantity
                if (discountCode) {
                    const discount = await DiscountModel.findOne({
                        code: discountCode,
                        isActive: true,
                        $or: [
                            { start_date: { $lte: new Date() }, end_date: { $gte: new Date() } },
                            { start_date: null, end_date: null }
                        ]
                    })
                    const currentDate = new Date()
                    if (discount) {
                        const itemAmount = currentPrice
                        let itemDiscount = 0
                        const isWithinDateRange = discount.start_date && discount.end_date ?
                            currentDate >= discount.start_date && currentDate <= discount.end_date : true;
                        if (isWithinDateRange) {
                            if (discount.unit === null || quantity >= discount.unit) {
                                if (discount.discount_type === Discount_TYPE.PERCENTAGE) {
                                    itemDiscount = (itemAmount * discount.value) / 100
                                } else {
                                    itemDiscount = discount.value
                                }
                            }
                            finalPrice = (itemAmount - itemDiscount) * quantity
                        }
                    } else {
                        console.log("No valid discount code found.");

                    }
                } else {
                    console.log("No Discount Code Provided. Using getApplicableDiscount for product discount.");
                    const appliedDiscount = await this.getApplicableDiscount(cartItem)
                    let productDiscount = 0
                    if (appliedDiscount) {
                        productDiscount = appliedDiscount.discountAmount
                    }
                    finalPrice = (currentPrice * quantity) - productDiscount
                }
                return finalPrice


            }
            for (const product of products) {
                const { productId, productVariantId, quantity } = product;


                const productData = await Product.findById(productId);
                if (!productData) throw new HttpException(404, 'This Product is not found');
                if (productData.stockLeft <= 0) throw new HttpException(404, `${productData.name} is not avalible for this time`)
                const productVariant = await ProductVariant.findOne({ _id: productVariantId, productId });
                if (!productVariant) throw new HttpException(404, 'This Product Variant is not found');
                if (productVariant.stockLeft <= 0) throw new HttpException(404, `this ${productVariant._id} is not avalible for this time `)


                const subCategory = await SubCategory.findById(productData.subCategoryId);
                const variantPrice = productVariant.price || 0;
                const discountedPrice = await calculateDiscountedPrice(discountCode, productId, productVariantId.toString(), quantity, variantPrice);
                totalPrice += discountedPrice
                console.log(`totalPrice ${totalPrice} and discountedPrice ${discountedPrice}`)


                createOrder.push({
                    productId,
                    productVariantId,
                    quantity,
                    finalPrice: discountedPrice
                });

                console.log(`Discounted price for product ${productId}: ${discountedPrice}`);


            }


            const payment = await this.payment.createRazorpayOrder(totalPrice, userId, 'razorpay', 'Order');
            console.log('payment', payment);

            const order_Id = `ORD-${new Date().getTime()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
            const order = await OrderModel.create({
                order_Id,
                userId,
                storeId,
                products,
                totalPrice,
                shippingAddress,
                orderStatus: 'pending',
                paymentStatus: 'unpaid',
                orderId: payment.orderId,

            });




            const io = this.notification.getIO()
            if (io) {
                try {
                    io.to(`store_${storeId}`).emit('Create-Order', {
                        modelName: 'Order',
                        orderId: order._id,
                        message: `New order from ${user.fullName}`,
                        type: 'new-order',
                        createdBy: 'User',
                        storeId: order.storeId,
                        userId: order.userId
                    });

                    console.log(`Notification sent to store ${storeId}`);
                    io.to('order-admin-room').emit('notification', {
                        modelName: 'Order',
                        orderId: order._id,
                        message: `New order received from ${user.fullName} for store ${store.storeName}`,
                        type: 'new-order',
                        createdBy: 'User',
                        userId: order.userId,
                        storeId: order.storeId

                    });
                    console.log('Notification sent to admin-room');

                } catch (error) {
                    console.error('Error emitting notification:', error);
                }
            }
            await this.notification.sendAdminNotification(
                'Order',
                `New order from ${user.fullName}`,
                'new-order',
                'User',
                userId,
                storeId,
                order.id
            );


            const populatedProducts = await Promise.all(
                createOrder.map(async (product) => {
                    const productData = await Product.findById(product.productId);
                    if (!productData) throw new HttpException(404, 'Product not found');

                    const productVariant = await ProductVariant.findOne({
                        _id: product.productVariantId,
                        productId: product.productId,
                    });
                    if (!productVariant) throw new HttpException(404, 'Product Variant not found');

                    return {
                        ...product,
                        name: productData.name || 'Unknown Product',
                        imageUrl: productVariant.images || productData.images || 'default-image-url.jpg',

                    };
                })
            );




            const emailDetails = {
                orderDate: new Date(),
                customerName: user.fullName || 'Valued Customer',
                email: user.email,
                products: populatedProducts.map(product => ({
                    productName: product.name,
                    productImage: product.imageUrl,
                    price: product.finalPrice,
                    quantity: product.quantity
                })),
                orderId: payment.orderId,
                subject: 'Your Purchase Details',
                order_Id,
                mailTitle: 'Thank you for your purchase!',

            };

            await sendPurchaseEmail(emailDetails)

            return { order, payment };
        } catch (error) {
            console.error('Error creating order:', error);
            throw new HttpException(500, 'Failed to create order');
        }
    }



    public async cancelOrder(id: string, userId: string, cancellationReason?: string): Promise<any> {
        console.log(`id:${id} and userId:${userId}`)
        try {
            const order = await OrderModel.findOne({ _id: id, userId: userId })
            if (!order) throw new HttpException(404, 'Order not found')
            if (order.orderStatus === 'cancelled') {
                throw new HttpException(400, 'Order already cancelled')
            }
            if (order.paymentStatus !== 'paid') {
                throw new HttpException(400, 'Order not paid')
            }

            const refundNotes = {
                cancelledBy: userId.toString(),
                reason: cancellationReason || 'Order Cancelled by user'
            };

            const refund = await razorpayInstance.payments.refund(order.paymentId, {
                amount: order.totalPrice * 100,
                speed: 'normal',
                notes: refundNotes

            })
            console.log("Order Cancelled Refund", refund)
            return {
                success: true,
                amount: order.totalPrice,
                message: "Your Order is Cancle "
            }
        } catch (error) {
            console.error('Error cancelling order:', error);
            throw new HttpException(500, 'Failed to cancel order');
        }
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


    public async getApplicableDiscount(cartItems: CartItem[]): Promise<(DiscountAttributes & { totalAfterDiscount?: number }) | null> {

        let totalOriginalPrice = 0;
        let totalAfterDiscount = 0;
        let discountBreakdown: any[] = [];
        let appliedDiscountId: number | null = null;



        for (const cartItem of cartItems) {
            const itemAmount = cartItem.variant?.price * cartItem.quantity || 0;
            totalOriginalPrice += itemAmount;
            let finalItemPrice = itemAmount;
            const itemQuantity = cartItem.quantity;

            const productDiscount = await DiscountModel.findOne({
                isActive: true,
                $or: [
                    { start_date: { $lte: new Date() }, end_date: { $gte: new Date() } },
                    { start_date: null, end_date: null }
                ],
                ProductIds: cartItem.Product_id
            })
            const currentDate = new Date();

            if (productDiscount) {
                const isWithinDateRange = productDiscount.start_date && productDiscount.end_date ?
                    currentDate >= productDiscount.start_date && currentDate <= productDiscount.end_date : true;

                if (isWithinDateRange) {

                    if (productDiscount.unit === null || itemQuantity >= productDiscount.unit) {

                        appliedDiscountId = productDiscount.id;
                        let itemDiscount = 0;
                        if (productDiscount.discount_type === Discount_TYPE.PERCENTAGE) {
                            itemDiscount = (itemAmount * productDiscount.value) / 100;
                        } else {
                            itemDiscount = productDiscount.value;
                        }
                        finalItemPrice = itemAmount - itemDiscount;
                        discountBreakdown.push({
                            discountType: 'product',
                            productId: cartItem.Product_id,
                            originalPrice: itemAmount,
                            quantity: cartItem.quantity,
                            discountApplied: itemDiscount,
                            finalPrice: finalItemPrice,
                            dateRange: productDiscount.start_date && productDiscount.end_date ?
                                `${productDiscount.start_date.toLocaleDateString()} to ${productDiscount.end_date?.toLocaleDateString()}` : 'No date restrictions'
                        });
                    }
                }
            }

            if (!productDiscount) {
                const subCategoryDiscount = await DiscountModel.findOne({
                    is_active: true,
                    $or: [
                        { start_date: { $lte: new Date() }, end_date: { $gte: new Date() } },
                        { start_date: null, end_date: null }
                    ],
                    SubCategoryIds: cartItem.Product?.SubCategory_id
                })

                if (subCategoryDiscount) {

                    const isWithinDateRange = subCategoryDiscount.start_date && subCategoryDiscount.end_date ?
                        currentDate >= subCategoryDiscount.start_date && currentDate <= subCategoryDiscount.end_date : true;

                    if (isWithinDateRange) {
                        if (subCategoryDiscount.unit === null || itemQuantity >= subCategoryDiscount.unit) {
                            appliedDiscountId = subCategoryDiscount.id;
                            let itemDiscount = 0;
                            if (subCategoryDiscount.discount_type === Discount_TYPE.PERCENTAGE) {
                                itemDiscount = (itemAmount * subCategoryDiscount.value) / 100;
                            } else {
                                itemDiscount = subCategoryDiscount.value;
                            }
                            finalItemPrice = itemAmount - itemDiscount;
                            discountBreakdown.push({
                                discountType: 'subcategory',
                                productId: cartItem.Product_id,
                                originalPrice: itemAmount,
                                quantity: itemQuantity,
                                discountApplied: itemDiscount,
                                finalPrice: finalItemPrice,
                                dateRange: subCategoryDiscount.start_date && subCategoryDiscount.end_date ?
                                    `${subCategoryDiscount.start_date.toLocaleDateString()} to ${subCategoryDiscount.end_date?.toLocaleDateString()}` : 'No date restrictions'
                            });
                        }
                    }
                }

                if (!subCategoryDiscount) {
                    const categoryDiscount = await DiscountModel.findOne({
                        is_active: true,
                        $or: [
                            { start_date: { $lte: new Date() }, end_date: { $gte: new Date() } },
                            { start_date: null, end_date: null }
                        ],
                        CategoryIds: cartItem.Product?.Category_id
                    })

                    if (categoryDiscount) {

                        const isWithinDateRange = categoryDiscount.start_date && categoryDiscount.end_date ?
                            currentDate >= categoryDiscount.start_date && currentDate <= categoryDiscount.end_date : true;

                        if (isWithinDateRange) {
                            if (categoryDiscount.unit === null || itemQuantity >= categoryDiscount.unit) {
                                appliedDiscountId = categoryDiscount.id;
                                let itemDiscount = 0;
                                if (categoryDiscount.discount_type === Discount_TYPE.PERCENTAGE) {
                                    itemDiscount = (itemAmount * categoryDiscount.value) / 100;
                                } else {
                                    itemDiscount = categoryDiscount.value;
                                }
                                finalItemPrice = itemAmount - itemDiscount;
                                discountBreakdown.push({
                                    discountType: 'category',
                                    productId: cartItem.Product_id,
                                    originalPrice: itemAmount,
                                    quantity: itemQuantity,
                                    discountApplied: itemDiscount,
                                    finalPrice: finalItemPrice,
                                    dateRange: categoryDiscount.start_date && categoryDiscount.end_date ?
                                        `${categoryDiscount.start_date.toLocaleDateString()} to ${categoryDiscount.end_date?.toLocaleDateString()}` : 'No date restrictions'
                                });
                            }
                        }
                    }
                }

            }

            totalAfterDiscount += finalItemPrice;
        }

        const totalDiscount = totalOriginalPrice - totalAfterDiscount;


        if (totalDiscount > 0) {

            const productDiscounts = discountBreakdown.filter(d => d.discountType === 'product');
            const subCategoryDiscounts = discountBreakdown.filter(d => d.discountType === 'subcategory');
            const categoryDiscounts = discountBreakdown.filter(d => d.discountType === 'category');

            const calculateTotals = (discounts: any[]) => ({
                originalTotal: discounts.reduce((sum, d) => sum + d.originalPrice, 0),
                discountTotal: discounts.reduce((sum, d) => sum + d.discountApplied, 0),
                finalTotal: discounts.reduce((sum, d) => sum + d.finalPrice, 0)
            });

            const productTotals = calculateTotals(productDiscounts);
            const subCategoryTotals = calculateTotals(subCategoryDiscounts);
            const categoryTotals = calculateTotals(categoryDiscounts);

            return {
                id: appliedDiscountId,
                discount_type: 'fixed',
                value: totalDiscount,
                is_active: true,
                discountAmount: totalDiscount,
                totalAfterDiscount: totalAfterDiscount,
                breakdown: {
                    product: {
                        discounts: productDiscounts,
                        totals: productTotals
                    },
                    subCategory: {
                        discounts: subCategoryDiscounts,
                        totals: subCategoryTotals
                    },
                    category: {
                        discounts: categoryDiscounts,
                        totals: categoryTotals
                    }
                }
            } as DiscountAttributes & {
                totalAfterDiscount: number,
                breakdown: {
                    product: { discounts: any[], totals: any },
                    subCategory: { discounts: any[], totals: any },
                    category: { discounts: any[], totals: any }
                }
            };
        }

        console.log("\nNo applicable discounts found");
        return null;
    }






    public async updateOrder(userId: string, orderId: string, orderData: any): Promise<any> {
        const { products: updatedProducts = [], discountCode } = orderData;
        const user = await UserModel.findById(userId)
        const order = await OrderModel.findOne({ _id: orderId, userId });
        if (!order) throw new HttpException(404, 'Order not found or you are not authorized to update it');

        if (order.orderStatus === 'confirmed' || order.orderStatus === 'shipped') {
            throw new HttpException(400, 'Cannot update order status once it is confirmed or shipped');
        }

        console.log("Current Order Details:", order);

        const currentProductVariantIds = order.products.map((p) => p.productVariantId);
        const productVariants = await ProductVariant.find({
            _id: { $in: currentProductVariantIds },
        });

        const currentPriceMap: Record<string, number> = {};
        productVariants.forEach((variant) => {
            currentPriceMap[variant._id.toString()] = variant.price;
        });

        let totalPrice = 0;
        const updatedOrderProducts = [];

        const calculateDiscountedPrice = async (discountCode: string, productId: string, variantId: string, quantity: number, currentPrice: number) => {
            const cartItem = [{
                Product_id: productId,
                quantity: quantity,
                variant: { price: currentPrice },
                discountCode: discountCode
            }];

            let finalPrice = currentPrice * quantity;
            if (discountCode) {
                console.log(`Checking for Discount Code: ${discountCode}`);
                const discount = await DiscountModel.findOne({
                    code: discountCode,
                    isActive: true,
                    $or: [
                        { start_date: { $lte: new Date() }, end_date: { $gte: new Date() } },
                        { start_date: null, end_date: null }
                    ]
                });


                const currentDate = new Date();

                if (discount) {
                    const itemAmount = currentPrice;
                    let itemDiscount = 0;
                    const isWithinDateRange = discount.start_date && discount.end_date ?
                        currentDate >= discount.start_date && currentDate <= discount.end_date : true;

                    if (isWithinDateRange) {
                        if (discount.unit === null || quantity >= discount.unit) {
                            if (discount.discount_type === Discount_TYPE.PERCENTAGE) {
                                itemDiscount = (itemAmount * discount.value) / 100;
                            } else {
                                itemDiscount = discount.value;
                            }

                            finalPrice = (itemAmount - itemDiscount) * quantity;

                        }
                    }
                } else {
                    console.log("No valid discount code found.");
                }
            } else {
                console.log("No Discount Code Provided. Using getApplicableDiscount for product discount.");

                const appliedDiscount = await this.getApplicableDiscount(cartItem);

                let productDiscount = 0;
                if (appliedDiscount) {
                    productDiscount = appliedDiscount.discountAmount;
                }

                finalPrice = (currentPrice * quantity) - productDiscount;
            }


            return finalPrice;
        };


        for (let currentProduct of order.products) {
            const variantId = currentProduct.productVariantId.toString();
            const currentPrice = currentPriceMap[variantId] || 0;

            const updatedProduct = updatedProducts.find(
                (p: any) => p.productVariantId.toString() === variantId
            );

            if (updatedProduct) {
                const updatedQuantity = updatedProduct.quantity || 0;

                const discountedPrice = await calculateDiscountedPrice(
                    discountCode,
                    currentProduct.productId.toString(),
                    variantId,
                    updatedQuantity,
                    currentPrice,
                );

                totalPrice += discountedPrice;
                updatedOrderProducts.push({
                    ...currentProduct,
                    finalPrice: discountedPrice,
                    quantity: updatedQuantity,
                });
            } else {
                const originalQuantity = currentProduct.quantity || 0;

                const discountedPrice = await calculateDiscountedPrice(
                    discountCode,
                    currentProduct.productId.toString(),
                    variantId,
                    originalQuantity,
                    currentPrice
                );

                totalPrice += discountedPrice;

                updatedOrderProducts.push({ ...currentProduct, finalPrice: discountedPrice, quantity: originalQuantity });
            }
        }

        for (let newProduct of updatedProducts) {
            const { productVariantId, quantity } = newProduct;

            if (!order.products.some((p) => p.productVariantId.toString() === productVariantId.toString())) {
                const variant = await ProductVariant.findById(productVariantId);
                if (!variant) throw new HttpException(404, `ProductVariant not found for ID: ${productVariantId}`);

                const newPrice = variant.price || 0;
                const product = await Product.findById(newProduct.productId);
                if (!product) {
                    throw new HttpException(404, `Product not found for ID: ${newProduct.productId}`);
                }

                const discountedPrice = await calculateDiscountedPrice(
                    discountCode,
                    newProduct.productId,
                    productVariantId.toString(),
                    quantity,
                    newPrice,
                );

                totalPrice += discountedPrice;
                updatedOrderProducts.push({
                    productId: variant.productId,
                    productVariantId,
                    quantity,
                    finalPrice: discountedPrice

                });
            }
        }

        console.log("Updated Total Price:", totalPrice);

        const storeId = order.storeId
        const UpdatedOrderId = `UPDATE-ORD-${new Date().getTime()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
        const payment = await this.payment.createRazorpayOrder(totalPrice, userId, 'razorpay', 'Order')
        order.products = updatedOrderProducts;
        order.totalPrice = Math.max(totalPrice, 0);
        order.order_Id = UpdatedOrderId
        order.orderId = payment.orderId
        order.shippingAddress = orderData.shippingAddress


        await order.save();

        console.log("Order Successfully Updated:", order);

        const io = await this.notification.getIO()
        if (io) {
            try {
                io.to(`store_${storeId}`).emit('Update-Order', {
                    modelName: 'Order',
                    orderId: order._id,
                    message: `Order updated by ${userId}`,
                    type: 'update-order',
                    createdBy: 'User',
                    storeId: order.storeId,
                    userId: order.userId
                });

                console.log(`Notification sent to store ${storeId}`);
                io.to('order-admin-room').emit('notification', {
                    modelName: 'Order',
                    orderId: order._id,
                    message: `Order updated for store ${storeId}`,
                    type: 'update-order',
                    createdBy: 'User',
                    userId: order.userId,
                    storeId: order.storeId,
                });
                console.log('Notification sent to admin-room');
            } catch (err) {
                console.error('Error emitting notification:', err);

            }
        }
        await this.notification.sendAdminNotification(
            'Order',
            `Update order from ${user.fullName}`,
            'order-updated',
            'User',
            userId,
            storeId.toString(),
            order.id
        );
        const populatedProducts = await Promise.all(
            updatedProducts.map(async (product) => {
                console.log('Product:', product);
                if (!product || !product.productId || !product.productVariantId) {
                    throw new HttpException(400, 'Invalid product or missing productId/productVariantId');
                }

                try {
                    const productData = await Product.findById(product.productId).lean();
                    if (!productData) throw new HttpException(404, 'Product Not found');
                    const productVariant = await ProductVariant.findOne({
                        _id: product.productVariantId,
                        productId: product.productId
                    }).lean();
                    if (!productVariant) throw new HttpException(404, 'Product Variant not found');
                    console.log('Fetched Product Variant:', productVariant);
                    const finalPrice = productVariant.price || productData.price;
                    console.log("finalPrice", finalPrice)
                    return {
                        ...product,
                        name: productData.name || 'Unknown Product',
                        imageUrl: productVariant.images || productData.images || 'default-image-url.jpg',
                        finalPrice: finalPrice * product.quantity || 0,
                    };
                } catch (error) {
                    console.error('Error fetching product/variant:', error.message);
                    throw error;
                }
            })
        );



        const emailData = {
            orderDate: new Date(),
            customerName: user.fullName || 'Valued Customer',
            email: user.email,
            products: populatedProducts.map(product => ({
                productName: product.name,
                productImage: product.imageUrl,
                price: product.finalPrice,
                quantity: product.quantity
            })),
            orderId: order.orderId,
            subject: 'Your Updated Purchase Details',
            mailTitle: 'Your order has been updated!',
            updatedFields: {
                storeId: order.storeId,
                orderStatus: order.orderStatus,
                totalPrice: order.totalPrice,
                shippingAddress: order.shippingAddress,
            }
        };



        await sendOrderUpdateEmail(emailData)


        return order;
    }


    public async updateOrderStatus(storeId: string, orderId: string, status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"): Promise<any> {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new HttpException(404, 'Order not found');
        const checkOrder = await OrderModel.findOne({ _id: orderId, storeId: storeId })

        if (!checkOrder) throw new HttpException(404, 'You are not accessible for update this order')
        order.orderStatus = status;

        await order.save();

        const store = await StoreModel.findById(order.storeId);
        const user = await UserModel.findById(order.userId);

        if (user && store) {
            const io = this.notification.getIO();
            if (io) {
                io.to(`store_${order.storeId}`).emit('Order-Status-Update', {
                    orderId: order._id,
                    status,
                    message: `Order ${order.orderId} status updated to ${status}`,
                    type: 'order-status-update',
                    storeId: order.storeId,
                    userId: order.userId
                });

                io.to('order-admin-room').emit('notification', {
                    orderId: order._id,
                    status,
                    message: `Order ${order.orderId} status updated to ${status}`,
                    type: 'order-status-update',
                    storeId: order.storeId,
                    userId: order.userId
                });
            }

            const emailDetails = {
                orderId: order.orderId,
                status,
                email: user.email,
                customerName: user.fullName,
                subject: 'Your Order Status Update',
                totalPrice: order.totalPrice
            };

            await sendStatusUpdateEmail(emailDetails);
        }

        return order;
    }



    public async getAllAdminOrders() {
        const orders = await OrderModel.find()
            .populate('userId', 'email')
            .populate('storeId', 'name')
            .populate('products.productId', 'name')
            .populate('products.productVariantId', 'variantDetails');
        const groupedOrder = orders.reduce((result, order) => {
            const user = order.userId as any
            const key = user?.email || "Unknown User";
            if (!result[key]) {
                result[key] = []
            }
            result[key].push(order)
            return result

        }, {})


        return groupedOrder;
    }





}

export default OrderService;
