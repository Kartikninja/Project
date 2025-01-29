import { HttpException } from "@/exceptions/httpException";
import { SubscriptionModel } from "@/models/Subscription.model";
import { UserModel } from "@/models/users.model";
import { UserSubscriptionModel } from "@/models/UserSubscriptionSchema.model";
import Container, { Service } from "typedi";
import { PaymentService } from "./Paymnet.Service";
import { PaymentModel } from "@/models/Payment.model";
import { NotificationService } from "./Notification.service";
import { sendpurchaseSubscriptionemail, sendSubscriptionExpiryEmail } from "@/utils/mailer";
import { User } from "@/interfaces/users.interface";
import { UserPurchaseSubScription, UserSubscription } from "@/interfaces/UserSubscription.interface";
import { RazorpayService } from "./razorpay.service";




@Service()
export class UserSubscriptionService {

    private payment = Container.get(PaymentService)
    private notification = Container.get(NotificationService)
    private razorpayService = Container.get(RazorpayService)

    public async addSubscription(userId: string, subscriptionId: string, startDate: Date, isAutoRenew: boolean) {


        const checkSub = await SubscriptionModel.findById({ _id: subscriptionId, isActive: true })

        if (!checkSub) {
            throw new HttpException(409, 'Subscription not found')
        }
        const price = checkSub.price
        const checkUser = await UserModel.findOne({ _id: userId, isActive: true })
        if (!checkUser) {
            throw new HttpException(409, 'User not found')
        }

        const checkSubUser = await UserSubscriptionModel.findOne({ userId, subscriptionId, isActive: true })
        if (checkSubUser) {
            throw new HttpException(409, 'Subscription already exists')
        }

        const startDateSelect = startDate || new Date();
        const endDate = new Date(startDateSelect)
        const newPayment = await this.payment.createRazorpayOrder(price, userId, 'razorpay', 'UserSubScription')

        const paymentLink = await this.payment.createRazorpayPaymentLink(
            checkSub.price,
            userId,
            'UserSubScription',
            newPayment.orderId,
            {
                name: checkUser.fullName,
                email: checkUser.email,
                contact: checkUser.phoneNumber,
            }
        );


        // endDate.setMonth(endDate.getMonth() + (checkSub.type === 2 ? 1 : 12))
        endDate.setMinutes(endDate.getMinutes() + 2);
        const userSubscriptionData = {
            userId,
            subscriptionId,
            startDate: startDate || new Date(),
            endDate,
            isActive: false,
            isAutoRenew,
            expiry: endDate,
            price,
            orderId: newPayment.orderId,


        };
        const newUserSubscription = new UserSubscriptionModel(userSubscriptionData);

        const savedSubscription = await newUserSubscription.save();

        await UserModel.findByIdAndUpdate(userId, { $push: { subscription: newUserSubscription._id } })

        const io = this.notification.getIO()
        if (io) {
            try {
                io.to(`subScription_${subscriptionId}`).emit('notification', {
                    modelName: 'UserSubscription',
                    userSubscriptionId: newUserSubscription.id,
                    message: `New SubScription Purchase ${newUserSubscription.userId}`,
                    type: 'User-Buy-subscription',
                    createdBy: 'User'
                })
                console.log(`Notification sent to SubScription ${subscriptionId}`);

            } catch (err) {
                console.log(`Error in subScription emmiting notification `, err)
            }
        }
        await this.notification.sendAdminNotification(
            'UserSubscription',
            `New Subscription purches ${newUserSubscription.userId}`,
            'User-Buy-subscription',
            'System',
            newUserSubscription.userId,
            undefined,
            undefined,
            newUserSubscription.id,
            subscriptionId,
        )


        const populatedUser = await UserModel.findById(userId).select('fullName email');
        const emailData = {
            userName: populatedUser?.fullName || 'Valued User',
            email: populatedUser?.email,
            subscriptionDetails: {
                startDate: startDateSelect,
                endDate: endDate,
                price,
                isAutoRenew,
                subscriptionId,
            },
            subscriptionId: subscriptionId
        };

        await sendpurchaseSubscriptionemail(emailData)

        const UserSubScriptionData = {
            razorpayPlanId: checkSub.razorpayPlanId,
            isAutoRenew: savedSubscription.isAutoRenew,
            start_date: savedSubscription.startDate,
            end_date: savedSubscription.endDate,
            userId: savedSubscription.userId,
            name: checkSub.name,
            price: savedSubscription.price,
        }







        const userSubscriptionPayment = await this.razorpayService.subscriptionPaymnet(UserSubScriptionData)

        savedSubscription.razorpaySubscriptionId = userSubscriptionPayment.id;




        await savedSubscription.save();




        return {
            subscription: savedSubscription, paymentDetails: newPayment,
            paymentLink: paymentLink.short_url
        };
    };



    public async activateUserSubscription(orderId: string): Promise<void> {
        try {
            const payment = await PaymentModel.findOne({ orderId });

            if (!payment) {
                throw new Error('Payment not found');
            }

            if (payment.status !== 'paid') {
                throw new Error('Payment not successful');
            }


            const userSubscription = await UserSubscriptionModel.findOne({
                userId: payment.userId,
                subscriptionId: payment.orderId,
                isActive: false
            });

            if (!userSubscription) {
                throw new Error('Subscription not found');
            }


            userSubscription.isActive = true;
            await userSubscription.save();

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
        const currentDate = new Date();
        const reminderDate = new Date(currentDate.setDate(currentDate.getDate() + 7));

        const expiringSubscriptions = await UserSubscriptionModel.find({
            paymentStatus: 'paid',
            expiry: { $lt: reminderDate },
            isActive: true
        }).populate<{ subscriptionId: UserSubscription, userId: UserPurchaseSubScription }>('subscriptionId userId');

        console.log("expiringSubscriptions", expiringSubscriptions);

        for (const sub of expiringSubscriptions) {
            const user = sub.userId;
            const subscription = sub.subscriptionId;

            console.log("check Sub function", sub);
            console.log("user check cron", user);
            console.log("user.fullName", user.fullName);

            const emailData = {
                userName: user.fullName,
                email: user.email,
                subscriptionDetails: {
                    startDate: sub.startDate.toDateString(),
                    endDate: sub.expiry.toDateString(),
                    price: subscription.price,
                    isAutoRenew: sub.isAutoRenew ? 'Enabled' : 'Disabled',
                    subscriptionId: subscription._id
                }
            };

            try {
                await sendSubscriptionExpiryEmail(emailData);
                console.log("Email sent successfully.");
            } catch (error) {
                console.error("Error sending email:", error);
            }
        }

        const expiredSubscriptions = await UserSubscriptionModel.find({
            endDate: { $lt: currentDate },
            isActive: true
        });
        console.log("expiredSubscriptions", expiredSubscriptions)

        for (const sub of expiredSubscriptions) {
            if (!sub.isAutoRenew) {
                sub.isActive = false;
                sub.startDate = null;
                sub.endDate = null;
                sub.expiry = null;
                await sub.save();

                await UserModel.findByIdAndUpdate(sub.userId, {
                    $pull: { subscription: sub._id },
                });
            } else {
                sub.isActive = true;
                await sub.save();
            }
        }

        console.log(`Checked and updated ${expiredSubscriptions.length} expired subscriptions.`);
    }





    public async cancleSubscription(id: string) {
        const checkSub = await UserSubscriptionModel.findById(id)
        console.log("checkSub", checkSub)
        if (checkSub) {

            const razorpaySubScriptionId = await this.razorpayService.cancleSubscription(checkSub.razorpaySubscriptionId)
            console.log("razorpaySubScriptionId", razorpaySubScriptionId)
            checkSub.isActive = false
            checkSub.startDate = null
            checkSub.endDate = null
            checkSub.expiry = null
            await checkSub.save()
            return true
        } else {
            throw new HttpException(500, 'This subCription is not in database')
        }
    }



}