import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { USER_TYPE } from 'src/user/type/userType';
import { Subscription_Duration, SUBSCRIPTION_DURATION } from '../type/subscriptionType';
import { SubscriptionFeature } from './subscriptionFeature.entity';

@Entity()
export class Subscription {
    @Exclude()
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    type: string;

    @Column()
    amount: number;

    @Column({
        type: 'enum',
        enum: ['Buyer', 'Provider']
    })
    user_type: USER_TYPE;

    @Column({
        type: 'enum',
        enum: Subscription_Duration,
    })
    duration: Subscription_Duration;

    @OneToMany((type) => SubscriptionFeature, (subscriptionFeature) =>  subscriptionFeature.subscription)
    subscriptionFeature: SubscriptionFeature[];

    @Exclude()
    @UpdateDateColumn({ select: false })
    updatedAt: Date;

    @Exclude()
    @CreateDateColumn({ select: false })
    createdAt: Date;
}
