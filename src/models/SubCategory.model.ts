import { SubCategoryInterface } from "@/interfaces/SubCategory.interface";
import { model, Schema, Document } from "mongoose";

const SubCategorySchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        images: [
            {
                type: String,
                required: false,
            },
        ],
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
    },
    {
        timestamps: true,
    }
);

export const SubCategory = model<SubCategoryInterface & Document>('SubCategory', SubCategorySchema);




// public async updateOrder(userId: string, orderId: string, orderData: any): Promise<any> {
//         const { products: updatedProducts = [], discountCode } = orderData;

//         const order = await OrderModel.findOne({ _id: orderId, userId });
//         if (!order) throw new HttpException(404, 'Order not found or you are not authorized to update it');

//         if (order.orderStatus === 'confirmed' || order.orderStatus === 'shipped') {
//             throw new HttpException(400, 'Cannot update order status once it is confirmed or shipped');
//         }

//         console.log("Current Order Details:", order);

//         const currentProductVariantIds = order.products.map((p) => p.productVariantId);
//         const productVariants = await ProductVariant.find({
//             _id: { $in: currentProductVariantIds },
//         });

//         console.log("Fetched Product Variants for Current Order:", productVariants);

//         const currentPriceMap: Record<string, number> = {};
//         productVariants.forEach((variant) => {
//             currentPriceMap[variant._id.toString()] = variant.price;
//         });

//         console.log("Current Price Map:", currentPriceMap);

//         let totalPrice = 0;
//         const updatedOrderProducts = [];

//         for (let currentProduct of order.products) {
//             const variantId = currentProduct.productVariantId.toString();
//             const currentPrice = currentPriceMap[variantId] || 0;

//             console.log("Processing Current Product:", {
//                 variantId,
//                 currentPrice,
//                 currentQuantity: currentProduct.quantity,
//             });

//             const updatedProduct = updatedProducts.find(
//                 (p: any) => p.productVariantId.toString() === variantId
//             );

//             if (updatedProduct) {
//                 const updatedQuantity = updatedProduct.quantity || 0;
//                 console.log("Updated Product Details:", {
//                     variantId,
//                     updatedQuantity,
//                     updatedTotalPrice: currentPrice * updatedQuantity,
//                 });

//                 console.log(`ProductId :${currentProduct.productId} and storeId :${order.storeId}`)
//                 const appliedDiscount = await this.getDiscount({
//                     discountCode,
//                     storeId: order.storeId.toString(),
//                     productId: currentProduct.productId,
//                     quantity: updatedQuantity
//                 });
//                 let productDiscount = 0;
//                 if (appliedDiscount) {
//                     const { discount_type, value } = appliedDiscount
//                     productDiscount = discount_type === Discount_TYPE.PERCENTAGE ?
//                         (currentPrice * value) / 100
//                         : value
//                 }

//                 const updatedTotalPrice = (currentPrice - productDiscount) * updatedQuantity
//                 totalPrice += updatedTotalPrice

//                 console.log("Updated Product Details with Discount:", {
//                     variantId,
//                     updatedQuantity,
//                     updatedTotalPrice,
//                     discountCode: appliedDiscount?.code,
//                     discountValue: productDiscount,
//                 });


//                 updatedOrderProducts.push({
//                     ...currentProduct,
//                     quantity: updatedQuantity
//                 })



//                 totalPrice += currentPrice * updatedQuantity;

//                 updatedOrderProducts.push({
//                     ...currentProduct,
//                     quantity: updatedQuantity,
//                 });
//             } else {
//                 const originalQuantity = currentProduct.quantity || 0;
//                 console.log(`ProductId :${currentProduct.productId} and storeId :${order.storeId}`)
//                 const appliedDiscount = await this.getDiscount({
//                     discountCode,
//                     storeId: order.storeId.toString(),
//                     productId: currentProduct.productId,
//                     quantity: originalQuantity

//                 })

//                 let productDiscount = 0;
//                 if (appliedDiscount) {
//                     const { discount_type, value } = appliedDiscount
//                     productDiscount = discount_type === Discount_TYPE.PERCENTAGE ?
//                         (currentPrice * value) / 100
//                         : value
//                 }

//                 const originalTotalPrice = (currentPrice - productDiscount) * originalQuantity
//                 totalPrice += originalTotalPrice;


//                 // console.log("Retaining Original Product:", {
//                 //     variantId,
//                 //     originalQuantity,
//                 //     originalTotalPrice: currentPrice * originalQuantity,
//                 // });

//                 console.log("Retaining Original Product with Discount:", {
//                     variantId,
//                     originalQuantity,
//                     originalTotalPrice,
//                     discountCode: appliedDiscount?.code,
//                     discountValue: productDiscount,
//                 });

//                 // totalPrice += currentPrice * originalQuantity;

//                 updatedOrderProducts.push(currentProduct);
//             }
//         }

//         for (let newProduct of updatedProducts) {
//             const { productVariantId, quantity } = newProduct;
//             if (!order.products.some((p) => p.productVariantId.toString() === productVariantId.toString())) {
//                 const variant = await ProductVariant.findById(productVariantId);
//                 if (!variant) throw new HttpException(404, `ProductVariant not found for ID: ${productVariantId}`);
//                 const newPrice = variant.price || 0;


//                 const appliedDiscount = await this.getDiscount({
//                     discountCode,
//                     storeId: order.storeId,
//                     productId: variant.productId,
//                     quantity

//                 })

//                 let productDiscount = 0

//                 if (appliedDiscount) {
//                     const { discount_type, value } = appliedDiscount
//                     productDiscount = discount_type === Discount_TYPE.PERCENTAGE ?
//                         (newPrice * value) / 100
//                         : value
//                 }

//                 const totalNewProductPrice = (newPrice - productDiscount) * quantity

//                 totalPrice += totalNewProductPrice

//                 // console.log("Adding New Product to Order:", {
//                 //     productVariantId,
//                 //     newPrice,
//                 //     quantity,
//                 //     newProductTotalPrice: newPrice * (quantity || 0),
//                 // });
//                 console.log("Adding New Product to Order with Discount:", {
//                     productVariantId,
//                     newPrice,
//                     quantity,
//                     totalNewProductPrice,
//                     discountCode: appliedDiscount?.code,
//                     discountValue: productDiscount,
//                 });
//                 // totalPrice += newPrice * (quantity || 0);

//                 updatedOrderProducts.push({
//                     productId: variant.productId,
//                     productVariantId,
//                     quantity,
//                 });
//             }
//         }

//         console.log("Final Updated Products List:", updatedOrderProducts);
//         console.log("Final Total Price:", totalPrice);

//         order.products = updatedOrderProducts;
//         order.totalPrice = Math.max(totalPrice, 0);

//         await order.save();

//         console.log("Order Successfully Updated:", order);


//         const io = await this.notification.getIO()
//         if (io) {
//             try {
//                 io.to(`store_${order.storeId}`).emit('Updated-order', {
//                     modelName: 'Order',
//                     orderId: order._id,
//                     message: `Order updated by user ${userId}`,
//                     type: 'update-order',
//                     updatedBy: 'User',
//                     storeId: order.storeId,
//                     userId: order.userId,
//                 })
//                 io.to('order-admin-room').emit('notification', {
//                     modelName: 'Order',
//                     orderId: order._id,
//                     message: `Order updated by user ${userId} for store ${order.storeId}`,
//                     type: 'update-order',
//                     updatedBy: 'User',
//                     userId: order.userId,
//                     storeId: order.storeId,
//                 })
//                 console.log(`Notification sent to store ${order.storeId} and admin room.`);

//             } catch (error) {
//                 console.error('Error emitting notification:', error);

//             }
//         }


//         return order;
//     }