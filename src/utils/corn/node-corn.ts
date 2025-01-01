import { UserSubscriptionService } from '@/services/UserSubscription.service';
import cron from 'node-cron';
import Container from 'typedi';

export const cron1 = cron.schedule('* * * * *', async () => {
    const expirySub = Container.get(UserSubscriptionService)
    console.log('Running daily subscription expiry check');
    try {
        console.log("Expired subscriptions checked and updated.");
        await expirySub.checkSubscriptionExpiry();
    } catch (error) {
        console.error("Error during cron job:", error);
    }
});

