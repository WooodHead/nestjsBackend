import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { BankService } from './bank.service';

@UseGuards(JwtAuthGuard)
@Controller('bank')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Get()
  findAll() {
    return this.bankService.findAll();
  }

}
