import { NextFunction, Request, Response } from "express";
import { Industry } from '@interfaces/industry.interface'
import Container from "typedi";
import { IndustryService } from "@services/Industry.service";
import { HttpException } from "@/exceptions/httpException";


export class IndustryController {
    public industry = Container.get(IndustryService);
    public addIndustryData = async (req: Request, res: Response, next: NextFunction) => {
        const { name, description, imageUrl, baseCostRange, isActive } = req.body;
        try {
            const industryData = { name, description, imageUrl, baseCostRange, isActive }
            const checkData = await this.industry.addIndustryData(industryData);

            return res.status(200).json({
                status: true,
                checkData,
                message: "Industry data Add Succcesfully",
            });
        } catch (error) {
            console.log("Error in Ading Data")

            if (error instanceof HttpException) {
                return res.status(error.status).json({
                    status: false,
                    message: error.message,
                });
            }
            res.status(500).json({
                status: false,
                message: "Error in Adding Industry"
            })

        }

    }


    public getIndusatryData = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const industries = await this.industry.getIndusatryData()
            return res.status(200).json({
                message: 'Industries retrieved successfully',
                data: industries,
                status: true
            });
        } catch (error) {
            next(error)
            console.log("Error in Getting Industry Data")

            if (error instanceof HttpException) {
                return res.status(error.status).json({
                    status: false,
                    message: error.message,
                });
            }
            res.status(500).json({
                status: false,
                message: "Error in getting Industry Data"
            })
        }
    }

    public getindustryDataById = async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params
        try {
            const industry: Industry | null = await this.industry.getindustryDataById(id)
            if (!industry) {
                return res.status(404).json({
                    message: 'Industry not found'
                })
            }
            return res.status(200).json({
                message: 'Industry retrieved successfully',
                data: industry,
                status: true
            })

        } catch (error) {
            next(error)
            if (error instanceof HttpException) {
                return res.status(error.status).json({
                    status: false,
                    message: error.message,
                });
            }
            res.status(500).json({
                status: false,
                message: "Error in getting Industry Data"
            })
        }
    }

    public deleteIndustry = async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params
        try {
            const industry: Industry | null = await this.industry.deleteIndustry(id)
            if (!industry) {
                return res.status(404).json({
                    message: 'Industry not found',
                    status: false
                })
            }
            return res.status(200).json({
                message: "Industry Deleted",
                industry,
                status: true

            })

        } catch (error) {
            next(error)
            if (error instanceof HttpException) {
                return res.status(error.status).json({
                    status: false,
                    message: error.message,
                });
            }
            res.status(500).json({
                status: false,
                message: "Error in Deleting Industry Data"
            })
        }
    }

    public updateIndustry = async (req: Request, res: Response, next: NextFunction) => {

        const { id } = req.params
        const { name, description, imageUrl, baseCostRange } = req.body
        try {
            const industryData = { name, description, imageUrl, baseCostRange }
            const updatedIndustry = await this.industry.updateIndustry(id, industryData)

            return res.status(200).json({
                status: true,
                updatedIndustry,
                message: "Industry data Update Succcesfully",

            });
        } catch (error) {
            console.error("Update industry error:", error);
            if (error instanceof HttpException) {
                return res.status(error.status).json({
                    status: false,
                    message: error.message,
                });
            }
            res.status(500).json({
                status: false,
                message: "Error in Updating  Industry"
            })

        }
    }


}





