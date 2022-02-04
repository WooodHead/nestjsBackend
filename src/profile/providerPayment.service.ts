import { Profile } from 'src/profile/entities/profile.entity';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { getConnection, Repository } from 'typeorm';
import { AddPaymentDto } from "./dto/addpaymentDetails.dto";
import { UpdatePaymentDto } from "./dto/updatepaymentDetails.dto"
import { ProviderPaymentDetails } from "./entities/providerPaymentDetails.entity";
import { User } from '../user/entities/user.entity';
import { BadRequestException } from "@nestjs/common";
import { Bank } from "src/bank/entities/bank.entity";


@Injectable()
export class PaymentService {

    constructor(
        @InjectRepository(ProviderPaymentDetails)
        private ProviderPayment: Repository<ProviderPaymentDetails>,
        @InjectRepository(User)
        private User: Repository<User>,
        @InjectRepository(Profile)
        private profileRepo: Repository<Profile>,
        @InjectRepository(Bank)
        private Bank: Repository<Bank>
    ) { }


    async createPaymentDetails(AddPaymentDto: AddPaymentDto) {

        try {

            let paymentUser = await this.User.findOne({
                where: {
                    id: AddPaymentDto.user
                },
                select: [
                    'firstName',
                    'lastName',
                    'email',
                    'id'
                ]
            });

            let bank = await this.Bank.findOne({
                where: {
                    id: AddPaymentDto.bank
                }
            })

            if (!paymentUser) {
                return {
                    success: false,
                    message: `User with id ${AddPaymentDto.user} doesn't exists!`
                }
            }

            if (!bank) {
                throw new BadRequestException(`Bank with id ${AddPaymentDto.bank} doesn't exists!`)
            }

            let currentPaymentDetails = await this.ProviderPayment.find({
                where: {
                    user: AddPaymentDto.user
                }
            })
            console.log(bank)
            console.log(currentPaymentDetails)
            let isFirstPaymentDetails: boolean = false
            if (currentPaymentDetails?.length <= 0) {
                isFirstPaymentDetails = true
            }

            let providerPaymentDetails = new ProviderPaymentDetails()
            providerPaymentDetails.user = paymentUser
            providerPaymentDetails.account_name = AddPaymentDto.account_name
            providerPaymentDetails.account_number = AddPaymentDto.account_number
            providerPaymentDetails.bank = bank
            providerPaymentDetails.isPrimary = isFirstPaymentDetails
            providerPaymentDetails.remarks = AddPaymentDto.remarks
            const paymentDetails = await this.ProviderPayment.save(providerPaymentDetails);

            // update stepper logic
            let userProfile = await this.profileRepo.findOne({
                where: {
                    user: AddPaymentDto.user
                }
            })
            userProfile.stepper = Math.max(userProfile.stepper, 5)
            await this.profileRepo.save(userProfile);

            return {
                success: true,
                message: "Payment details saved successfully!",
                data: paymentDetails
            };
        } catch (error) {
            console.log(error);
            throw new BadRequestException('Problem in saving payment info!')
        }

    }

    async update(userId, paymentDetailsId, updatePaymentDto: UpdatePaymentDto) {
        try {

            const initialData = await this.ProviderPayment.findOne({
                where: [{ user: userId, id: paymentDetailsId }]
            })

            Object.keys(updatePaymentDto).forEach(key => {
                if (initialData[key]) {
                    initialData[key] = updatePaymentDto[key]
                }
                else throw new BadRequestException('Problem in updating payment info!')
            })

            await this.ProviderPayment.save(initialData)

            return {
                success: true,
                message: "Successfully updated payment Info!"
            }

        } catch (error) {
            console.log(error);
            throw new BadRequestException('Problem in updating payment info!')
        }
    }



    async setPrimaryAccount(userId, paymentDetailsId) {

        try {

            // sets all payment details to not primary
            let resetPrimary = await getConnection()
                .createQueryBuilder()
                .update(ProviderPaymentDetails)
                .set({
                    isPrimary: false
                })
                .where({
                    user: userId
                })
                .execute();

            // sets specific payment details to true
            let setPrimary = await getConnection()
                .createQueryBuilder()
                .update(ProviderPaymentDetails)
                .set({
                    isPrimary: true
                })
                .where({
                    user: userId,
                    id: paymentDetailsId
                })
                .execute();

            if (setPrimary && setPrimary.affected == 1) {
                return {
                    success: true,
                    message: "Successfully saved primary account!"
                }
            } else {
                throw new BadRequestException('Problem in saving primary account!')
            }

        } catch (error) {
            console.log(error)
            throw new BadRequestException('Problem in saving primary account!')
        }
    }



    async getAllBankAccountInfo(userId: string) {

        try {

            let allBankAccounts = await this.ProviderPayment.find({
                where: { user: userId },
                select: [
                    'id',
                    'account_name',
                    'account_number',
                    'isPrimary',
                    'user',
                ],
                relations: ['bank']
            })

            if (allBankAccounts) {
                return {
                    success: true,
                    message: "Successfully fetched bank accounts!",
                    data: allBankAccounts
                }
            } else {
                throw new BadRequestException("Problem in fetching bank accounts")
            }

        } catch (error) {
            console.log(error)
            throw new BadRequestException("Problem in fetching bank accounts")
        }

    }


    async deleteBankAccount(paymentDetailsId: string) {
        try {

            await this.ProviderPayment.delete(paymentDetailsId)

            return {
                success: true,
                message: "Bank account deleted successfully!"
            }

        } catch (error) {
            console.log(error)
            throw new BadRequestException("Problem in deleting bank account!")
        }
    }
}