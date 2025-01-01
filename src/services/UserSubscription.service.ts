import { CreateUserSubscriptionDto } from "@/dtos/UserSubscription .dto";
import { HttpException } from "@/exceptions/httpException";
import { SubscriptionModel } from "@/models/Subscription.model";
import { UserModel } from "@/models/users.model";
import { UserSubscriptionModel } from "@/models/UserSubscriptionSchema.model";
import { SUBSCRIPTIONS_TYPES } from "@/utils/constant";
import Container, { Service } from "typedi";
import { PaymentService } from "./Paymnet.Service";
import { PaymentModel } from "@/models/Payment.model";




@Service()
export class UserSubscriptionService {

    private payment = Container.get(PaymentService)

    public async addSubscription(userId: string, subscriptionId: string, startDate: Date, isAutoRenew: boolean) {


        const checkSub = await SubscriptionModel.findById({ _id: subscriptionId })
        console.log("checkSub", checkSub)
        console.log("checkSub.isActive", checkSub.isActive)
        if (!checkSub || checkSub.isActive === false) {
            throw new HttpException(409, 'Subscription not found')
        }
        const price = checkSub.price
        const checkUser = await UserModel.findOne({ _id: userId })
        if (!checkUser) {
            throw new HttpException(409, 'User not found')
        }

        console.log("price", price)
        const checkSubUser = await UserSubscriptionModel.findOne({ userId, subscriptionId, isActive: true })
        if (checkSubUser) {
            throw new HttpException(409, 'Subscription already exists')
        }

        const newPayment = await this.payment.createRazorpayOrder(price, userId, 'razorpay', 'SubScription')
        console.log("newPayment", newPayment)
        console.log("newPayment.transactionId", newPayment.transactionId)
        const startDateSelect = startDate || new Date();
        console.log("Start Date:", startDateSelect);
        const endDate = new Date(startDateSelect)
        // endDate.setMonth(endDate.getMonth() + (checkSub.type === 2 ? 1 : 12))
        endDate.setMinutes(endDate.getMinutes() + 2);
        const userSubscriptionData = {
            userId,
            subscriptionId,
            startDate: startDate || new Date(),
            endDate,
            isActive: true,
            isAutoRenew,
            expiry: endDate,
            price,
            transactionId: newPayment.transactionId,

        };

        const newUserSubscription = new UserSubscriptionModel(userSubscriptionData);
        const savedSubscription = await newUserSubscription.save();
        await UserModel.findByIdAndUpdate(userId, { $push: { subscription: newUserSubscription._id } })
        return { subscription: savedSubscription, paymentDetails: newPayment };
    };

    public async activateUserSubscription(transactionId: string): Promise<void> {
        try {
            // Find the payment with the given transactionId
            const payment = await PaymentModel.findOne({ transactionId });

            if (!payment) {
                throw new Error('Payment not found');
            }

            // Check if the payment was successful
            if (payment.status !== 'paid') {
                throw new Error('Payment not successful');
            }


            const userSubscription = await UserSubscriptionModel.findOne({
                userId: payment.userId,
                subscriptionId: payment.transactionId,
                isActive: false
            });

            if (!userSubscription) {
                throw new Error('Subscription not found');
            }


            userSubscription.isActive = true;
            await userSubscription.save();

            // Optionally, you could update the user model as well
            await UserModel.findByIdAndUpdate(payment.userId, { $push: { subscription: userSubscription._id } });

            console.log('Subscription activated successfully!');
        } catch (error) {
            console.error('Error activating subscription:', error);
        }
    }


    public async getAllSubscriptions() {
        const result = await UserSubscriptionModel.find()
        return result
    }


    public async getSubscriptionById(id: string) {
        const result = await UserSubscriptionModel.findById(id)
        return result

    }

    public async deleteSubscription(id: string) {
        const result = await UserSubscriptionModel.findByIdAndDelete(id)
        return result
    }



    public async checkSubscriptionExpiry() {

        const currentDate = new Date()
        const expiredSubscribeption = await UserSubscriptionModel.find({
            endDate: { $lt: currentDate },
            isActive: true
        })

        for (const sub of expiredSubscribeption) {
            if (!sub.isAutoRenew) {

                sub.isActive = false
                sub.startDate = null;
                sub.endDate = null;
                sub.expiry = null;
                await sub.save();
                await UserModel.findByIdAndUpdate(sub.userId, {
                    $pull: { subscription: sub._id },
                });

            } else {
                sub.isActive = true
                await sub.save()
            }
        }
        console.log(`Checked and updated ${expiredSubscribeption.length} expired subscriptions.`);

    }





}