// src/services/Payout.service.ts
import { PayoutModel } from '@/models/Payout.model';
import { HttpException } from '@/exceptions/httpException';
import { StoreModel } from '@/models/Store.model';
import { Service } from 'typedi';
import Razorpay from 'razorpay';



const razorpay = new Razorpay({
    key_id: "rzp_test_ly2znj2ybm1Qqm",
    key_secret: "22ZNfSFxTpBBr5U9ycVU19zW",
})
@Service()
export class PayoutService {

    public async payoutCus(storeId: string, amount: number) {
        try {

            const store = await StoreModel.findById(storeId)
                .select('razorpayFundAccountId');
            console.log("store", store)
            if (!store?.razorpayFundAccountId) {
                throw new HttpException(400, 'Store has no verified fund account');
            }

            console.log("razorpay", razorpay)
            const payout = await razorpay.payouts.create({
                account_number: '38730100002442',
                fund_account_id: store.razorpayFundAccountId,
                amount: amount * 100, // Convert to paise
                currency: 'INR',
                mode: 'IMPS', // or 'NEFT', 'UPI'
                purpose: 'payout',
                reference_id: `payout_${Date.now()}`,
                queue_if_low_balance: true,
            });
            console.log("payout", payout)

            const newPayout = await PayoutModel.create({
                amount,
                fundAccountId: store.razorpayFundAccountId,
                storeId,
                razorpayPayoutId: payout.id,
                status: payout.status,
                fees: payout.fees,
                utr: payout.utr
            });

            return newPayout;
        } catch (error) {
            const errorMessage = error.error?.description || error.message;
            throw new HttpException(error.statusCode || 500, errorMessage);
        }
    }

    public async getPayoutStatus(payoutId: string) {
        try {
            const payout = await razorpay.payouts.fetch(payoutId);
            return payout;
        } catch (error) {
            throw new HttpException(500, 'Failed to fetch payout status');
        }
    }
}