import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { saveLogs } from 'src/util/logger';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { SubCategory } from './entities/sub-category.entity';

@Injectable()
export class SkillService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private logger: Logger,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(SubCategory)
    private subCategoryRepository: Repository<SubCategory>,
  ) {}

  async getAllCategory() {
    try {
      return await this.categoryRepository.find();
    } catch (err) {
      saveLogs(this.logger, 'at finding all skill category', err);
    }
  }

  async createCategory(name: string) {
    const newCategory = await this.categoryRepository.save({ name });
    return newCategory;
  }

  async findOneCategory(categoryId: string) {
    try {
      return await this.categoryRepository.findOne({ id: categoryId });
    } catch (err) {
      saveLogs(this.logger, 'at finding one specific category', err);
    }
  }

  async findOneCategoryWithSubCategory(categoryId: string) {
    try {
      const category = await this.categoryRepository.findOne(
        { id: categoryId },
        { relations: ['subCategory'] },
      );
      return category;
    } catch (err) {
      saveLogs(
        this.logger,
        'at finding one category with its sub category',
        err,
      );
    }
  }

  async updateCategory(name: string, categoryId: string) {
    const category = await this.categoryRepository.findOne({ id: categoryId });
    category.name = name;
    await this.categoryRepository.save(category);
    return { updated: true };
  }

  async deleteCategory(categoryId: string) {
    return await this.categoryRepository.delete({ id: categoryId });
  }

  async createSubCategory(categoryId: string, name: string) {
    const newSubCategory = await this.subCategoryRepository.create({ name });
    const category = await this.categoryRepository.findOne({
      id: categoryId,
    });
    newSubCategory.category = category;
    const updatedSubCategory = await this.subCategoryRepository.save(
      newSubCategory,
    );
    return updatedSubCategory;
  }

  async findOneSubCategory(subCategoryId: string) {
    try {
      const subCategory = await this.subCategoryRepository.findOne({
        id: subCategoryId,
      });
      return subCategory;
    } catch (err) {
      saveLogs(this.logger, 'at finding one subcategory', err);
    }
  }

  async updateSubCategory(subCategoryId: string, name: string) {
    const subCategory = await this.subCategoryRepository.findOne({
      id: subCategoryId,
    });
    subCategory.name = name;
    await this.subCategoryRepository.save(subCategory);
    return { updated: true };
  }

  async deleteSubCategory(subCategoryId: string) {
    return await this.subCategoryRepository.delete({ id: subCategoryId });
  }
}
