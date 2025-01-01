import { HttpException } from "@/exceptions/httpException";
import { Subscription } from "@/interfaces/Subscription.interface";
import { SubscriptionModel } from "@/models/Subscription.model";
import { Service } from "typedi";

@Service()
export class SubscriptionService {


    public async getAll() {
        const SubAll = await SubscriptionModel.find({ isActive: true })
        return SubAll

    }

    public async add(SubscriptionData: Subscription) {

        const checkName = await SubscriptionModel.find({ name: SubscriptionData.name })
        console.log(checkName)
        if (checkName.length > 0) {
            throw new HttpException(409, `${SubscriptionData.name} name is already exists`)
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