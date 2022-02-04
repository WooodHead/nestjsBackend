import { Bank } from './entities/bank.entity';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class BankService {

  constructor(
    @InjectRepository(Bank)
    private bankRepo: Repository<Bank>
  ) { }

  async findAll() {
    try {
      let banks = await this.bankRepo.find({
        select: [
          'id',
          'bank_code',
          'bank_name'
        ]
      });
      return {
        success: false,
        message: "Banks fetched successfully!",
        data: banks
      }
    } catch (error) {
      console.log(error)
      throw new BadRequestException("Problem in fetching banks!")
    }
  }


}
