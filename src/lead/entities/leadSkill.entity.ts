import { Exclude } from 'class-transformer';
import { Category } from '../../skill/entities/category.entity';
import { SubCategory } from '../../skill/entities/sub-category.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { SKILL_PROFICIENCY_TYPE } from '../types/skillProficiency';
import { Lead } from './lead.entity';

@Entity()
export class LeadSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne((type) => Category, {
    createForeignKeyConstraints: false,
    // eager: true,
  })
  @JoinColumn()
  category: Category;

  @OneToOne((type) => SubCategory, {
    createForeignKeyConstraints: false,
    eager: true,
  })
  @JoinColumn()
  subCategory: SubCategory;

  @Column({ type: 'enum', enum: ['Beginner', 'Intermediate', 'Expert'] })
  proficiency: SKILL_PROFICIENCY_TYPE;

  @Exclude()
  @ManyToOne((type) => Lead, (lead) => lead.skills, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  lead: Lead;
}
