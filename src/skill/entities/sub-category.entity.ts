import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateEvent,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Category } from './category.entity';

@Entity()
export class SubCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Exclude()
  @CreateDateColumn()
  createdAt: Date;

  @Exclude()
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Category, (category) => category.subCategory, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  category: Category;
}
