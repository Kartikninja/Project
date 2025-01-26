import { HttpException } from '@/exceptions/httpException';
import { UserModel } from '@/models/users.model';
import axios from 'axios';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import { Service } from 'typedi';





const razorpay = new Razorpay({
    key_id: "rzp_test_ly2znj2ybm1Qqm",
    key_secret: "22ZNfSFxTpBBr5U9ycVU19zW",
})


@Service()

export class RazorpayService {

    public async createRazorpayCustomer(userId: string) {
        const user = await UserModel.findById(userId).exec();

        try {

            if (!user.customerId || user.customerId === null) {
                const customer = await razorpay.customers.create({
                    email: user.email,
                    contact: user.phoneNumber,
                    name: user.fullName,
                });

                user.customerId = customer.id;
                await user.save();

                console.log('Created Razorpay Customer:', customer);
            }

            return user.customerId;
        } catch (err) {
            console.log(err);
            throw new HttpException(500, 'Error in creating Custome')
        }
    }

    public async createCustomer(store: any) {
        const contactData = {
            name: store.fullName,
            email: store.email,
            contact: store.phoneNumber,
            type: 'vendor',
            reference_id: store.storeName,
            notes: {

                "notes_key_1": "Some important note about the store",
                "notes_key_2": "Another note"
            }
        };
        try {
            const customer = await razorpay.customers.create(contactData);
            return customer;
        } catch (error) {
            throw new Error(`Error creating customer: ${error.message}`);
        }
    }

    public async createFundAccount(contactId: string, bankDetails: any) {
        const fundAccountData = {
            customer_id: contactId,
            account_type: 'bank_account',
            bank_account: {
                name: bankDetails.accountHolderName,
                account_number: bankDetails.accountNumber,
                ifsc: bankDetails.ifsc,
            },
        };
        try {
            const fundAccount = await razorpay.fundAccount.create(fundAccountData);
            return fundAccount;
        } catch (error) {
            throw new Error(`Error creating fund account: ${error.message}`);
        }
    }


    public async verifyFundAccount(fundAccountId: string) {
        try {

            const fundAccount = await razorpay.fundAccount.fetch(fundAccountId);
            return fundAccount;
        } catch (error) {

            const statusCode = error.statusCode || 500;
            const errorMessage = error.error?.description || 'Fund account verification failed';


            console.error('Razorpay Error:', JSON.stringify(error, null, 2));

            throw new HttpException(statusCode, errorMessage);
        }
    }

    public async transferAmountToSeller(fundAccountId: string, amout: number): Promise<any> {


        try {
            const transferResponse = await razorpay.transfers.create({
                account: fundAccountId,
                amount: amout * 100,
                currency: 'INR',
                notes: {
                    orderId: `order_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`
                }
            });
            console.log('Transfer successful:', transferResponse);

        } catch (err) {
            console.error('Transfer failed:', err);
            throw new HttpException(500, 'Failed to transfer amount to seller');
        }
    }


    public async subscriptionPaymnet(subScriptionData: any) {


        const startAtTimestamp = Math.floor(subScriptionData.start_date / 1000);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const adjustedStartAt = startAtTimestamp < currentTimestamp ? currentTimestamp + 60 : startAtTimestamp;

        try {
            const option = {
                plan_id: subScriptionData.razorpayPlanId,
                customer_notify: false,
                total_count: 12,
                start_at: adjustedStartAt,
                // customerId: subScriptionData.customerId,
                notes: {
                    user_id: subScriptionData.userId,
                },
                addons: [
                    {
                        item: {
                            name: subScriptionData.name,
                            amount: subScriptionData.price * 100,
                            currency: 'INR'
                        }
                    }
                ]
            }



            const sub = await razorpay.subscriptions.create(option)

            return sub

        } catch (err) {
            console.error('Error in subscription payment:', err);
            throw new HttpException(500, 'Failed to process subscription payment');
        }
    }




    public async cancleSubscription(id: string) {
        try {
            const subscription = await razorpay.subscriptions.cancel(id)
            console.log("cancle subscription", subscription)
            return subscription

        } catch (err) {
            console.error('Error in cancelling subscription:', err);
            throw new HttpException(500, 'Error in Cancle SubScription')
        }
    }



}





// public async createPayout(fundAccountId: string, amount: number, currency: string) {
//     try {
//         const payout = await razorpay.payouts.create({
//             fund_account_id: fundAccountId,
//             amount,
//             currency,
//         });
//         return payout;
//     } catch (error) {
//         throw new Error(`Error creating payout: ${error.message}`);
//     }
// }