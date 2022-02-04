import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SentryInterceptor } from 'src/sentry.interceptor';
import { SkillService } from './skill.service';

// @UseGuards(JwtAuthGuard)
@UseInterceptors(SentryInterceptor)
@Controller('skill')
export class SkillController {
  constructor(private skillService: SkillService) {}

  @Get('category')
  async getAllCategory() {
    return this.skillService.getAllCategory();
  }

  // @Post('category')
  // async createCategory(@Body() { name }: { name: string }) {
  //   return this.skillService.createCategory(name);
  // }

  @Get('category/:categoryId')
  async getOneCategory(@Param() params) {
    return this.skillService.findOneCategoryWithSubCategory(params.categoryId);
  }

  @Get('category/single/:categoryId')
  async getOneCategorySingle(@Param() params) {
    return this.skillService.findOneCategory(params.categoryId);
  }

  // @Put('category/:categoryId')
  // async updateCategory(
  //   @Param() params,
  //   @Body() { categoryName }: { categoryName: string },
  // ) {
  //   return this.skillService.updateCategory(categoryName, params.categoryId);
  // }

  // @Delete('category/:categoryId')
  // async deleteCategory(@Param() params) {
  //   return this.skillService.deleteCategory(params.categoryId);
  // }

  // @Post('sub-category/:categoryId')
  // async createSubCategory(@Body() { name }: { name: string }, @Param() params) {
  //   return this.skillService.createSubCategory(params.categoryId, name);
  // }

  @Get('sub-category/:subCategoryId')
  async findOneSubCategory(@Param() params) {
    return this.skillService.findOneSubCategory(params.subCategoryId);
  }

  // @Put('sub-category/:subCategoryId')
  // async updateSubCategory(@Body() { name }: { name: string }, @Param() params) {
  //   return this.skillService.updateSubCategory(params.subCategoryId, name);
  // }

  // @Delete('sub-category/:subCategoryId')
  // async deleteSubCategory(@Param() params) {
  //   return this.skillService.deleteSubCategory(params.subCategoryId);
  // }
}
