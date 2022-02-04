
import { Subscription } from './subscription.entity';
import { Exclude } from "class-transformer";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Feature } from 'src/feature/entities/feature.entity';
import { SubscriptionFeatureKeyType, SubscriptionFeatureValueType, SUBSCRIPTION_FEATURE_KEY_TYPE, SUBSCRIPTION_FEATURE_VALUE_TYPE } from '../type/subscriptionFeatureType';



@Entity()
export class SubscriptionFeature {
    @Exclude()
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne((type) => Subscription, (subscription) => subscription.id, { nullable: false })
    @JoinColumn()
    subscription: Subscription;

    @ManyToOne((type) => Feature, (feature) => feature.id, { nullable: false, eager: true })
    @JoinColumn()
    feature: Feature;

    @Column({
        type: 'enum',
        enum: SubscriptionFeatureKeyType,
        nullable: true
    })
    key: SUBSCRIPTION_FEATURE_KEY_TYPE;

    @Column(
        {
            nullable: true
        }
    )
    value: string;

    @Column({
        type: 'enum',
        enum: SubscriptionFeatureValueType,
        nullable: true
    })
    valueType: SUBSCRIPTION_FEATURE_VALUE_TYPE;

    @Exclude()
    @UpdateDateColumn({ select: false })
    updatedAt: Date;

    @Exclude()
    @CreateDateColumn({ select: false })
    createdAt: Date;
}