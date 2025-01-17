import { PaymentController } from "@/controllers/Payment.controller";
import { Routes } from "@/interfaces/routes.interface";
import { Router } from "express";

export class PaymentRouter implements Routes {
    public path = '/payment'
    public router = Router()
    public payment = new PaymentController()


    constructor() {
        this.intializeRouter()
    }
    private intializeRouter() {
        this.router.post(`${this.path}/create`, this.payment.createPayment)
        this.router.put(`${this.path}/update-status`, this.payment.updatePaymentStatus)

        this.router.post(`${this.path}/createRazorPay`, this.payment.createRazorpayPayment)

        this.router.post(`${this.path}/verify/payment`, this.payment.verifyPayment)
    }

}
