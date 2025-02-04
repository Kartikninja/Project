import { Payout, PayoutModel } from '@/models/Payout.model';
import { HttpException } from '@/exceptions/httpException';
import { StoreModel } from '@/models/Store.model';
import { Service } from 'typedi';
import Razorpay from 'razorpay';
import { RAZORPAY_API_KEY, RAZORPAY_API_SECRET } from '@config'
import axios from 'axios';
import { RAZORPAYX_API_KEY, RAZORPAYX_API_SECRET, RAZORPAYX_ACCOUNT_NUMBER } from '@config'
import { PaymentDocument } from '@/interfaces/Payment.interface';
import { Payoutinterface } from '@/interfaces/Payout.interface';
import mongoose from 'mongoose';

const razorpay = new Razorpay({
    key_id: "rzp_test_kghAwVX1ISLmoi",
    key_secret: "NnB5pXhUXLranWMEUPuF31L4",
})



const razorpayX = new Razorpay({
    key_id: "rzp_test_kghAwVX1ISLmoi",
    key_secret: "NnB5pXhUXLranWMEUPuF31L4",

})


const RAZORPAYX_API_BASE = 'https://api.razorpay.com/v1';
const RAZORPAYX_KEY_ID = 'rzp_test_kghAwVX1ISLmoi';
const RAZORPAYX_KEY_SECRET = 'NnB5pXhUXLranWMEUPuF31L4';

const razorpayXAuthHeader = {
    Authorization: `Basic ${Buffer.from(`${RAZORPAYX_KEY_ID}:${RAZORPAYX_KEY_SECRET}`).toString('base64')}`,
    'Content-Type': 'application/json',
};



@Service()
export class PayoutService {

    public async createRazorpayAccount(storeData: any) {
        const auth = {
            username: RAZORPAY_API_KEY!,
            password: RAZORPAY_API_SECRET!,
        };

        const bankDetails = storeData.payoutBankDetails;

        const payload = {
            email: storeData.email,
            phone: storeData.phoneNumber,
            legal_business_name: storeData.storeName,
            business_type: 'individual',
            profile: {
                category: 'ecommerce',
                addresses: {
                    operation: {
                        street1: storeData.address || 'N/A',
                        city: 'City Name',
                        state: 'State Name',
                        postal_code: 560000,
                        country: 'IN'
                    }
                }
            },
            bank_account: {
                beneficiary_name: storeData.fullName,
                account_number: bankDetails.accountNumber,
                ifsc: bankDetails.ifsc
            }
        };

        try {
            const response = await axios.post(
                'https://api.razorpay.com/v2/accounts',
                payload,
                { auth }
            );
            return response.data;
        } catch (error) {
            console.error('Razorpay account creation failed:', error.response?.data);
            throw error;
        }




    };


    public async amoutToSeller(fundAccountId: string, amout: number, sellerData: any) {
        console.log("sellerData", sellerData)
        const payoutData = {

            account_number: RAZORPAYX_ACCOUNT_NUMBER,
            fund_account_id: fundAccountId,
            amount: amout * 100,
            currency: "INR",
            mode: "IMPS",
            purpose: "payout",
            queue_if_low_balance: true,
            reference_id: `PO_${Date.now()}_${sellerData.storeId}`,
            narration: "Acme Corp Fund Transfer",
            notes: {
                store_id: sellerData._id,
            }
        }
        try {
            const response = await axios.post(`${RAZORPAYX_API_BASE}/payouts`, payoutData, { headers: razorpayXAuthHeader })


            return response.data
        } catch (error) {
            throw new Error(`Payout failed: ${error.response.data.error.description}`);
        }

    }


    public async payoutReversal(payment: PaymentDocument) {
        console.log("payoutReversal->payment", payment)

        const payout = await PayoutModel.findOne({ orderId: payment.orderId })
        console.log("payoutReversal->payout", payout)
        if (!payout) return;
        switch (payout.status) {
            case 'pending':
                await PayoutModel.findByIdAndUpdate(payout._id, {
                    status: 'cancelled',
                    refundId: payment.refundId
                });
                return { success: true, message: 'Payout cancelled' };

            case 'processed':

                try {
                    await this.reversePayout(payout, payment);
                    return { success: true, message: 'Payout reversed' };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            case 'failed':
                break

        }
    }


    public async reversePayout(payout: Payout, payment: any) {
        try {
            if (!payout.razorpayPayoutId) {
                throw new Error('No Razorpay payout ID found');
            }


            console.log(`payout :${payout} and payment ${payment}`)

            const payoutDetails = await axios.get(`https://api.razorpay.com/v1/payouts/${payout.razorpayPayoutId}`, {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${RAZORPAYX_KEY_ID}:${RAZORPAYX_KEY_SECRET}`).toString('base64')}`,
                },
            });
            console.log('===========This is Payout fetch Data========')
            console.log(payoutDetails.data);

            console.log('===========End of Payout fetch Data========')

            const reversal = await axios.post(
                `${RAZORPAYX_API_BASE}/payouts/${payout.razorpayPayoutId}/reversals`,
                {
                    reason: 'refund',
                    remarks: `Refund ID: ${payment.refundId}`
                },
                { headers: razorpayXAuthHeader }
            );

            console.log('Reversal API Call', reversal)

            await PayoutModel.findByIdAndUpdate(payout._id, {
                reversalId: reversal.data.id,
                reversalStatus: 'reversed',
                status: 'reversed',
                refundId: payment.refundId
            });

        } catch (error) {
            await PayoutModel.findByIdAndUpdate(payout._id, {
                reversalStatus: 'failed',
                error: error.response?.data?.error?.description || error.message
            });
            console.log('Error in ReversePayout function')
            throw error;
        }
    }


    public async getPayoutStatus(payoutId: string) {
        try {
            const response = await axios.get(`https://api.razorpay.com/v1/payouts/${payoutId}`, {
                headers: razorpayXAuthHeader,
            });
            return response.data;
        } catch (error) {
            throw new HttpException(500, 'Failed to fetch payout status');
        }
    }


}



