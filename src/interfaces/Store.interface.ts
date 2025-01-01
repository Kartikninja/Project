import { Document, ObjectId } from 'mongoose';

interface Location {
    type: string;
    coordinates: [number, number];
}
interface Store {
    userId: ObjectId;
    storeName: string;
    storeImage?: string[];
    storeDescription?: string;
    location?: Location;
    subscription?: ObjectId;
    discountApplied: ObjectId[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    status: 'pending' | 'approved' | 'rejected';

}

export interface StoreDocument extends Store, Document { }

