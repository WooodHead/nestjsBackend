import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity()
export class UserSubscriptionHistory {
  @Exclude()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user: string;

  @Column()
  subscription: string;

  @Column()
  renewed_at: Date;

  @Column()
  expires_at: Date;

  @Column()
  status: string;

  @Exclude()
  @UpdateDateColumn({ select: false })
  updatedAt: Date;

  @Exclude()
  @CreateDateColumn({ select: false })
  createdAt: Date;

  @Exclude()
  @CreateDateColumn({ select: false })
  createdAtHistory: Date;
}
