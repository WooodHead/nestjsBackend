import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Bank {
  @Exclude()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bank_code: number;

  @Column()
  bank_name: string;

  @Exclude()
  @UpdateDateColumn({ select: false })
  updatedAt: Date;

  @Exclude()
  @CreateDateColumn({ select: false })
  createdAt: Date;
}
