export interface BaseCostRange {
    minCost: number;
    maxCost: number;
}



export interface Industry {
    _id?: string;
    name: string;
    description: string;
    imageUrl: string;
    baseCostRange: BaseCostRange,
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;

}
