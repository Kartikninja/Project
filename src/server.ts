import { App } from '@/app';
import { AuthRoute } from '@routes/auth.route';
import { UserRoute } from './routes/user.route';
import { SubscriptionRoute } from './routes/Subscription.route';
import { UserSubscriptionRoute } from './routes/UserSubscription.route';
import { StoreRoute } from './routes/Store.route';
import { PaymentRouter } from './routes/Payment .route';
import ProductRouter from './routes/Product.route';
import CategoryRoute from './routes/Category.route';
import SubCategoryRoute from './routes/SubCategory.route';
import ProductVariantRouter from './routes/ProductVariant.route';
import OrderRouter from './routes/Order.route';
import { DiscountRouter } from './routes/Discount.route';
import { NotificationRoute } from './routes/Notifiaction.route';




const app = new App([new AuthRoute(), new UserRoute(), new SubscriptionRoute(), new UserSubscriptionRoute(),
new StoreRoute(),
new PaymentRouter(),
new ProductRouter(),
new CategoryRoute(),
new SubCategoryRoute(),
new ProductVariantRouter(),
new OrderRouter(),
new DiscountRouter(),
    // new NotificationRoute()
]);

app.listen();
