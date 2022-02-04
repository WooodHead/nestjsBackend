import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Subscription } from 'src/subscription/entities/subscription.entity';
import {
  SubscriptionStatus,
  SUBSCRIPTION_STATUS,
} from '../type/userSubscriptionTypes';

@Entity()
export class UserSubscription {
  @Exclude()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne((type) => User, (user) => user.id, { eager: true })
  @JoinColumn()
  user: User;

  @ManyToOne((type) => Subscription, (subscription) => subscription.id, {
    eager: true,
  })
  @JoinColumn()
  subscription: Subscription;

  @Column()
  renewed_at: Date;

  @Column()
  expires_at: Date;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
  })
  status: SubscriptionStatus;

  @Exclude()
  @UpdateDateColumn({ select: false })
  updatedAt: Date;

  @Exclude()
  @CreateDateColumn({ select: false })
  createdAt: Date;
}
