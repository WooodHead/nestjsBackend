import { SKILL_PROFICIENCY_TYPE } from 'src/lead/types/skillProficiency';
import { Category } from 'src/skill/entities/category.entity';
import { SubCategory } from 'src/skill/entities/sub-category.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Profile } from './profile.entity';

@Entity()
export class UserSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne((type) => Category, {
    createForeignKeyConstraints: false,
    eager: true,
  })
  @JoinColumn()
  category: Category;

  @OneToOne((type) => SubCategory, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn()
  subCategory: SubCategory;

  @Column({ type: 'enum', enum: ['Beginner', 'Intermediate', 'Expert'] })
  proficiency: SKILL_PROFICIENCY_TYPE;

  @ManyToOne((type) => Profile, (profile) => profile.skills, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  profile: Profile;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
