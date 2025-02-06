import { HttpException } from "@/exceptions/httpException";
import { Subscription } from "@/interfaces/Subscription.interface";
import { SubscriptionModel } from "@/models/Subscription.model";
import Razorpay from "razorpay";
import { Service } from "typedi";




const razorpay = new Razorpay({
    key_id: "rzp_test_oPTupXhgKYgwXA",
    key_secret: "Y2fY65okD7D08aI9AmWXxCX0",
})
@Service()
export class SubscriptionService {


    public async getAll() {
        const SubAll = await SubscriptionModel.find({ isActive: true })
        return SubAll

    }

    public async CreateSubscription(SubscriptionData: Subscription) {

        const checkName = await SubscriptionModel.find({ name: { $regex: new RegExp(`^${SubscriptionData.name}`) } })
        console.log(checkName)
        if (checkName.length > 0) {
            throw new HttpException(409, `${SubscriptionData.name} name is already exists`)
        }
        let razorpayPlan;
        try {
            razorpayPlan = await razorpay.plans.create({
                period: SubscriptionData.period,
                interval: 1,
                item: {
                    name: SubscriptionData.name,
                    amount: Math.round(SubscriptionData.price * 100),
                    currency: 'INR',
                    description: SubscriptionData.benefite.join(', '),
                },

            });
            console.log("razorpayPlan", razorpayPlan)
            SubscriptionData.razorpayPlanId = razorpayPlan.id
        } catch (error) {
            throw new HttpException(500, `Failed to create Razorpay plan: ${error.message}`);
        }


        const newSubscription = await SubscriptionModel.create(SubscriptionData)
        await newSubscription.save()
        return newSubscription;
    }



    public async getById(id: string) {

        const subscription = await SubscriptionModel.findById(id)
        if (!subscription) {
            throw new HttpException(404, `Subscription with id ${id} not found`)
        }
        return subscription
    }

    public async delete(id: string) {
        console.log(id)
        const subscription = await SubscriptionModel.findById(id)
        console.log(subscription)
        if (!subscription) {
            throw new HttpException(404, `Subscription with id ${id} not found`)
        }
        await subscription.deleteOne()
        return subscription
    }

}