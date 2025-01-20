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


    // io.to('store-admin-room').emit('send-notification', {
    //     modelName: 'Order',
    //     id: order._id,
    //     message: `New order received from ${user.fullName} for store ${store.name}`,
    //     type: 'new-order',
    //     createdBy: 'User'
    // });

    private async getDiscount({
        discountCode,
        storeId,
        productId,
        subCategoryId,
        categoryId,
        quantity,
    }: {
        discountCode?: string;
        storeId: string;
        productId?: string;
        subCategoryId?: string;
        categoryId?: string;
        quantity?: number;
    }) {





        const query: any = {
            storeId,
            isActive: true,
        };
        console.log("discountCode", discountCode)


        if (discountCode) {
            query.code = discountCode;
        } else {

            query.$or = [
                productId ? { productIds: { $in: [productId] } } : {},
                categoryId ? { categoryIds: { $in: [categoryId] } } : {},
                subCategoryId ? { subcategoryIds: { $in: [subCategoryId] } } : {}
            ].filter(Boolean);
        }

        console.log('Discount Query:', query);

        const discount = await DiscountModel.findOne(query);
        console.log('Found Discount:', discount);
        if (discount) {
            if (discount.unit !== null && quantity >= discount.unit) {
                return discount;
            }

            if (discount.start_date && discount.end_date) {
                const currentDate = new Date()
                if (currentDate >= discount.start_date && currentDate <= discount.end_date) {
                    if (discount.unit !== null) {
                        if (quantity >= discount.unit) {
                            return discount
                        } else {
                            return null
                        }
                    }
                    else {
                        return discount;
                    }
                } else if (discount.start_date === null && discount.end_date === null) {

                    if (quantity >= discount.unit) {
                        return discount
                    } else {
                        return null
                    }

                }
            }

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






    public async updateOrder(userId: string, orderId: string, orderData: any): Promise<any> {
        const { products: updatedProducts = [], discountCode } = orderData;

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

        // console.log("Fetched Product Variants for Current Order:", productVariants);

        const currentPriceMap: Record<string, number> = {};
        productVariants.forEach((variant) => {
            currentPriceMap[variant._id.toString()] = variant.price;
        });

        // console.log("Current Price Map:", currentPriceMap);

        let totalPrice = 0;
        const updatedOrderProducts = [];

        for (let currentProduct of order.products) {
            const variantId = currentProduct.productVariantId.toString();
            const currentPrice = currentPriceMap[variantId] || 0;

            console.log("Processing Current Product:", {
                variantId,
                currentPrice,
                currentQuantity: currentProduct.quantity,
            });

            const updatedProduct = updatedProducts.find(
                (p: any) => p.productVariantId.toString() === variantId
            );

            let productDiscount = 0;
            if (updatedProduct) {
                const updatedQuantity = updatedProduct.quantity || 0;
                // console.log("Updated Product Details:", {
                //     variantId,
                //     updatedQuantity,
                //     updatedTotalPrice: currentPrice * updatedQuantity,
                // });


                const product = await Product.findById(currentProduct.productId);
                if (!product) {
                    throw new HttpException(404, `Product not found for ID: ${currentProduct.productId}`);
                }

                console.log("productId for updatedProduct", product._id)
                const subCategory = await SubCategory.findById(product.subCategoryId);
                const categoryId = subCategory ? subCategory.categoryId.toString() : null;
                console.log("subCategoryId for updatedProduct", subCategory._id)
                console.log("CategoryId for updatedProduct", categoryId)


                const appliedDiscount = await this.getDiscount({
                    discountCode,
                    storeId: order.storeId.toString(),
                    productId: currentProduct.productId.toString(),
                    categoryId,
                    subCategoryId: product.subCategoryId,
                    quantity: updatedQuantity,
                });
                console.log("appliedDiscount for UpdatedProduct", appliedDiscount);

                let productDiscount = 0;
                if (appliedDiscount) {
                    const { discount_type, value } = appliedDiscount;
                    productDiscount = discount_type === Discount_TYPE.PERCENTAGE ? (currentPrice * value) / 100 : value;
                    console.log("Product Discount for updated Product", productDiscount)
                }

                const discountedPrice = (currentPrice - productDiscount) * updatedQuantity;
                console.log("discountedPrice  for UpdatedProduct", discountedPrice);
                totalPrice += discountedPrice;

                if (appliedDiscount) {
                    console.log(`Discount applied for product ${currentProduct.productId}:`, {
                        // code: appliedDiscount.code,
                        // discountType: appliedDiscount.discount_type,
                        // value: appliedDiscount.value,
                        productDiscount,
                    });
                }

                updatedOrderProducts.push({
                    ...currentProduct,
                    quantity: updatedQuantity,
                });
            }
            else {
                const originalQuantity = currentProduct.quantity || 0;
                // console.log("Retaining Original Product:", {
                //     variantId,
                //     originalQuantity,
                //     originalTotalPrice: currentPrice * originalQuantity,
                // });
                const product = await Product.findById(currentProduct.productId);
                if (!product) {
                    throw new HttpException(404, `Product not found for ID: ${currentProduct.productId}`);
                }



                const subCategory = await SubCategory.findById(product.subCategoryId);
                const categoryId = subCategory ? subCategory.categoryId.toString() : null;


                const appliedDiscount = await this.getDiscount({
                    discountCode,
                    storeId: order.storeId.toString(),
                    productId: currentProduct.productId.toString(),
                    categoryId,
                    subCategoryId: product.subCategoryId,
                    quantity: originalQuantity,
                });
                console.log("appliedDiscount for not updtaedProduct", appliedDiscount);

                if (appliedDiscount) {
                    const { discount_type, value } = appliedDiscount;
                    productDiscount = discount_type === Discount_TYPE.PERCENTAGE ? (currentPrice * value) / 100 : value;
                    console.log("productDiscount for not updatedProduct", productDiscount);
                }

                const discountedPrice = (currentPrice - productDiscount) * originalQuantity;
                console.log("discountedPrice for not updtaedProduct", discountedPrice);
                console.log("totalPrice for not updtaedProduct", totalPrice)
                totalPrice += discountedPrice;
                console.log("totalPrice for not updtaedProduct", totalPrice)

                updatedOrderProducts.push(currentProduct);
            }
        }


        for (let newProduct of updatedProducts) {
            const { productVariantId, quantity } = newProduct;

            // Check if the product variant already exists in the order
            if (!order.products.some((p) => p.productVariantId.toString() === productVariantId.toString())) {
                // Fetch the product variant by ID
                const variant = await ProductVariant.findById(productVariantId);
                if (!variant) throw new HttpException(404, `ProductVariant not found for ID: ${productVariantId}`);

                const newPrice = variant.price || 0; // Variant price for the product
                let productDiscount = 0;

                // Fetch the product associated with the variant
                const product = await Product.findById(newProduct.productId);
                if (!product) {
                    throw new HttpException(404, `Product not found for ID: ${newProduct.productId}`);
                }

                // Fetch the subcategory and category associated with the product
                const subCategory = await SubCategory.findById(product.subCategoryId);
                const categoryId = subCategory ? subCategory.categoryId.toString() : null;

                // Log subcategory and category information
                console.log(`For new product (ID: ${newProduct.productId}), subCategory: ${subCategory?._id}, Category: ${categoryId}`);

                // Fetch the applied discount
                const appliedDiscount = await this.getDiscount({
                    discountCode,
                    storeId: order.storeId.toString(),
                    productId: newProduct.productId,
                    categoryId,
                    subCategoryId: product.subCategoryId,
                    quantity,
                });

                // Log the applied discount
                if (appliedDiscount) {
                    console.log(`Applied Discount for product (ID: ${newProduct.productId}):`, appliedDiscount);
                } else {
                    console.log(`No discount found for product (ID: ${newProduct.productId})`);
                }

                // Apply discount if found
                if (appliedDiscount) {
                    const { discount_type, value } = appliedDiscount;
                    console.log("Original Price for product:", newPrice);

                    // Calculate the discount based on the discount type (percentage or fixed value)
                    productDiscount = discount_type === Discount_TYPE.PERCENTAGE
                        ? (newPrice * value) / 100 // Apply percentage discount
                        : value; // Apply fixed discount

                    console.log("Discount applied for product (ID: " + newProduct.productId + "):", productDiscount);
                }

                // Calculate the discounted price for the product
                const discountedPrice = (newPrice - productDiscount) * quantity;
                console.log("Discounted price for product (ID: " + newProduct.productId + "):", discountedPrice);
                console.log("totalPrice", totalPrice)
                // Add the discounted price to the total price
                totalPrice += discountedPrice;
                console.log("totalPrice after adding", totalPrice)

                // Log the updated total price after each product
                console.log("Updated Total Price after adding product (ID: " + newProduct.productId + "):", totalPrice);

                // Add updated product information to the list
                updatedOrderProducts.push({
                    productId: variant.productId,
                    productVariantId,
                    quantity,
                });
            }
        }

        // Log the updated order total price
        console.log("Updated Total Price:", totalPrice);



        console.log("Final Updated Products List:", updatedOrderProducts);
        console.log("Final Total Price:", totalPrice);

        order.products = updatedOrderProducts;
        order.totalPrice = Math.max(totalPrice, 0);

        await order.save();

        console.log("Order Successfully Updated:", order);

        return order;
    }






























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
