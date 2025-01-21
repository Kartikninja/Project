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
import mongoose from 'mongoose';
import { CartItem, DiscountAttributes } from '@/interfaces/Discount.interface';



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
                                finalPrice = (itemAmount - itemDiscount) * quantity
                            }
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

                const productVariant = await ProductVariant.findOne({ _id: productVariantId, productId });
                if (!productVariant) throw new HttpException(404, 'This Product Variant is not found');



                const subCategory = await SubCategory.findById(productData.subCategoryId);
                const variantPrice = productVariant.price || 0;
                const discountedPrice = await calculateDiscountedPrice(discountCode, productId, productVariantId.toString(), quantity, variantPrice);

                totalPrice += discountedPrice


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

            console.log("products for quatity", products)
            const populatedProducts = await Promise.all(
                products.map(async (product) => {
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


            console.log("products", populatedProducts)

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
                transactionId: payment.transactionId,
                subject: 'Your Purchase Details',
                orderId,
                mailTitle: 'Thank you for your purchase!',

            };


            await sendPurchaseEmail(emailDetails)

            return { order, payment };
        } catch (error) {
            console.error('Error creating order:', error);
            throw new HttpException(500, 'Failed to create order');
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
        console.log("getApplicableDiscount");

        console.log("cartItems for discount", cartItems)
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
                    finalPrice: currentPrice,
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

                updatedOrderProducts.push({ ...currentProduct, finalPrice: currentPrice, quantity: originalQuantity });
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
                    finalPrice: newPrice

                });
            }
        }

        console.log("Updated Total Price:", totalPrice);

        order.products = updatedOrderProducts;
        order.totalPrice = Math.max(totalPrice, 0);

        await order.save();

        console.log("Order Successfully Updated:", order);

        const storeId = order.storeId
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










    // public async updateOrder(userId: string, orderId: string, orderData: any): Promise<any> {
    //     const { products: updatedProducts = [], discountCode } = orderData;

    //     const order = await OrderModel.findOne({ _id: orderId, userId });
    //     if (!order) throw new HttpException(404, 'Order not found or you are not authorized to update it');

    //     if (order.orderStatus === 'confirmed' || order.orderStatus === 'shipped') {
    //         throw new HttpException(400, 'Cannot update order status once it is confirmed or shipped');
    //     }

    //     console.log("Current Order Details:", order);

    //     const currentProductVariantIds = order.products.map((p) => p.productVariantId);
    //     const productVariants = await ProductVariant.find({
    //         _id: { $in: currentProductVariantIds },
    //     });

    //     // console.log("Fetched Product Variants for Current Order:", productVariants);

    //     const currentPriceMap: Record<string, number> = {};
    //     productVariants.forEach((variant) => {
    //         currentPriceMap[variant._id.toString()] = variant.price;
    //     });

    //     // console.log("Current Price Map:", currentPriceMap);

    //     let totalPrice = 0;
    //     const updatedOrderProducts = [];

    //     for (let currentProduct of order.products) {
    //         const variantId = currentProduct.productVariantId.toString();
    //         const currentPrice = currentPriceMap[variantId] || 0;

    //         console.log("Processing Current Product:", {
    //             variantId,
    //             currentPrice,
    //             currentQuantity: currentProduct.quantity,
    //         });

    //         const updatedProduct = updatedProducts.find(
    //             (p: any) => p.productVariantId.toString() === variantId
    //         );

    //         let productDiscount = 0;
    //         if (updatedProduct) {
    //             const updatedQuantity = updatedProduct.quantity || 0;
    //             // console.log("Updated Product Details:", {
    //             //     variantId,
    //             //     updatedQuantity,
    //             //     updatedTotalPrice: currentPrice * updatedQuantity,
    //             // });


    //             const product = await Product.findById(currentProduct.productId);
    //             if (!product) {
    //                 throw new HttpException(404, `Product not found for ID: ${currentProduct.productId}`);
    //             }

    //             console.log("productId for updatedProduct", product._id)
    //             const subCategory = await SubCategory.findById(product.subCategoryId);
    //             const categoryId = subCategory ? subCategory.categoryId.toString() : null;
    //             console.log("subCategoryId for updatedProduct", subCategory._id)
    //             console.log("CategoryId for updatedProduct", categoryId)


    //             const appliedDiscount = await this.getDiscount({
    //                 discountCode,
    //                 storeId: order.storeId.toString(),
    //                 productId: currentProduct.productId.toString(),
    //                 categoryId,
    //                 subCategoryId: product.subCategoryId,
    //                 quantity: updatedQuantity,
    //             });
    //             console.log("appliedDiscount for UpdatedProduct", appliedDiscount);

    //             let productDiscount = 0;
    //             if (appliedDiscount) {
    //                 const { discount_type, value } = appliedDiscount;
    //                 productDiscount = discount_type === Discount_TYPE.PERCENTAGE ? (currentPrice * value) / 100 : value;
    //                 console.log("Product Discount for updated Product", productDiscount)
    //             }

    //             const discountedPrice = (currentPrice - productDiscount) * updatedQuantity;
    //             console.log("discountedPrice  for UpdatedProduct", discountedPrice);
    //             totalPrice += discountedPrice;

    //             if (appliedDiscount) {
    //                 console.log(`Discount applied for product ${currentProduct.productId}:`, {
    //                     // code: appliedDiscount.code,
    //                     // discountType: appliedDiscount.discount_type,
    //                     // value: appliedDiscount.value,
    //                     productDiscount,
    //                 });
    //             }

    //             updatedOrderProducts.push({
    //                 ...currentProduct,
    //                 quantity: updatedQuantity,
    //             });
    //         }
    //         else {
    //             const originalQuantity = currentProduct.quantity || 0;
    //             // console.log("Retaining Original Product:", {
    //             //     variantId,
    //             //     originalQuantity,
    //             //     originalTotalPrice: currentPrice * originalQuantity,
    //             // });
    //             const product = await Product.findById(currentProduct.productId);
    //             if (!product) {
    //                 throw new HttpException(404, `Product not found for ID: ${currentProduct.productId}`);
    //             }



    //             const subCategory = await SubCategory.findById(product.subCategoryId);
    //             const categoryId = subCategory ? subCategory.categoryId.toString() : null;


    //             const appliedDiscount = await this.getDiscount({
    //                 discountCode,
    //                 storeId: order.storeId.toString(),
    //                 productId: currentProduct.productId.toString(),
    //                 categoryId,
    //                 subCategoryId: product.subCategoryId,
    //                 quantity: originalQuantity,
    //             });
    //             console.log("appliedDiscount for not updtaedProduct", appliedDiscount);

    //             if (appliedDiscount) {
    //                 const { discount_type, value } = appliedDiscount;
    //                 productDiscount = discount_type === Discount_TYPE.PERCENTAGE ? (currentPrice * value) / 100 : value;
    //                 console.log("productDiscount for not updatedProduct", productDiscount);
    //             }

    //             const discountedPrice = (currentPrice - productDiscount) * originalQuantity;
    //             console.log("discountedPrice for not updtaedProduct", discountedPrice);

    //             totalPrice += discountedPrice;

    //             updatedOrderProducts.push(currentProduct);
    //         }
    //     }


    //     for (let newProduct of updatedProducts) {
    //         const { productVariantId, quantity } = newProduct;

    //         if (!order.products.some((p) => p.productVariantId.toString() === productVariantId.toString())) {
    //             const variant = await ProductVariant.findById(productVariantId);
    //             if (!variant) throw new HttpException(404, `ProductVariant not found for ID: ${productVariantId}`);

    //             const newPrice = variant.price || 0;
    //             let productDiscount = 0;

    //             const product = await Product.findById(newProduct.productId);
    //             if (!product) {
    //                 throw new HttpException(404, `Product not found for ID: ${newProduct.productId}`);
    //             }

    //             const subCategory = await SubCategory.findById(product.subCategoryId);
    //             const categoryId = subCategory ? subCategory.categoryId.toString() : null;

    //             console.log(`For new product (ID: ${newProduct.productId}), subCategory: ${subCategory?._id}, Category: ${categoryId}`);

    //             const appliedDiscount = await this.getDiscount({
    //                 discountCode,
    //                 storeId: order.storeId.toString(),
    //                 productId: newProduct.productId,
    //                 categoryId,
    //                 subCategoryId: product.subCategoryId,
    //                 quantity,
    //             });

    //             if (appliedDiscount) {
    //                 console.log(`Applied Discount for product (ID: ${newProduct.productId}):`, appliedDiscount);
    //             } else {
    //                 console.log(`No discount found for product (ID: ${newProduct.productId})`);
    //             }

    //             if (appliedDiscount) {
    //                 const { discount_type, value } = appliedDiscount;
    //                 console.log("Original Price for product:", newPrice);

    //                 productDiscount = discount_type === Discount_TYPE.PERCENTAGE
    //                     ? (newPrice * value) / 100
    //                     : value;

    //                 console.log("Discount applied for product (ID: " + newProduct.productId + "):", productDiscount);
    //             }


    //             const discountedPrice = (newPrice - productDiscount) * quantity;
    //             console.log("Discounted price for product (ID: " + newProduct.productId + "):", discountedPrice);
    //             console.log("totalPrice", totalPrice)

    //             totalPrice += discountedPrice;
    //             console.log("totalPrice after adding", totalPrice)


    //             console.log("Updated Total Price after adding product (ID: " + newProduct.productId + "):", totalPrice);


    //             updatedOrderProducts.push({
    //                 productId: variant.productId,
    //                 productVariantId,
    //                 quantity,
    //             });
    //         }
    //     }


    //     console.log("Updated Total Price:", totalPrice);



    //     console.log("Final Updated Products List:", updatedOrderProducts);
    //     console.log("Final Total Price:", totalPrice);

    //     order.products = updatedOrderProducts;
    //     order.totalPrice = Math.max(totalPrice, 0);

    //     await order.save();

    //     console.log("Order Successfully Updated:", order);

    //     return order;
    // }






    // public async updateOrder(userId: string, orderId: string, orderData: any): Promise<any> {
    //     const { products: updatedProducts = [], discountCode } = orderData;

    //     const order = await OrderModel.findOne({ _id: orderId, userId });
    //     if (!order) throw new HttpException(404, 'Order not found or unauthorized access');

    //     if (['confirmed', 'shipped'].includes(order.orderStatus)) {
    //         throw new HttpException(400, 'Cannot update order status after confirmation or shipment');
    //     }

    //     const currentProductVariantIds = order.products.map((p) => p.productVariantId);
    //     const productVariants = await ProductVariant.find({ _id: { $in: currentProductVariantIds } });
    //     const currentPriceMap = Object.fromEntries(productVariants.map(v => [v._id.toString(), v.price]));

    //     let totalPrice = 0;
    //     const updatedOrderProducts = [];

    //     // Process existing products
    //     for (const currentProduct of order.products) {
    //         const variantId = currentProduct.productVariantId.toString();
    //         const currentPrice = currentPriceMap[variantId] || 0;

    //         const discount = await this.getDiscount({
    //             storeId: order.storeId.toString(),
    //             productId: currentProduct.productId.toString(),
    //             subCategoryId: currentProduct.subCategoryId?.toString(),
    //             categoryId: currentProduct.categoryId?.toString(),
    //             quantity: currentProduct.quantity,
    //         });

    //         const finalPrice = discount
    //             ? currentPrice * (1 - discount.percentage / 100)
    //             : currentPrice;

    //         totalPrice += finalPrice * currentProduct.quantity;

    //         updatedOrderProducts.push({ ...currentProduct, price: finalPrice });
    //     }

    //     // Process new products
    //     for (const newProduct of updatedProducts) {
    //         const { productId, productVariantId, quantity } = newProduct;
    //         const productVariant = await ProductVariant.findOne({ _id: productVariantId });
    //         if (!productVariant) throw new HttpException(404, 'Product variant not found');

    //         const discount = await this.getDiscount({
    //             storeId: order.storeId.toString(),
    //             productId: productId.toString(),
    //             subCategoryId: productVariant.subCategoryId?.toString(),
    //             categoryId: productVariant.categoryId?.toString(),
    //             quantity,
    //         });

    //         const finalPrice = discount
    //             ? productVariant.price * (1 - discount.percentage / 100)
    //             : productVariant.price;

    //         totalPrice += finalPrice * quantity;

    //         updatedOrderProducts.push({ ...newProduct, price: finalPrice });
    //     }

    //     const updatedOrder = await OrderModel.updateOne(
    //         { _id: orderId, __v: order.__v },
    //         {
    //             $set: { products: updatedOrderProducts, totalPrice, updatedAt: new Date() },
    //             $inc: { __v: 1 },
    //         }
    //     );

    //     return updatedOrder;
    // }
























    public async updateOrderStatus(orderId: string, status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"): Promise<any> {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new HttpException(404, 'Order not found');

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




}

export default OrderService;
