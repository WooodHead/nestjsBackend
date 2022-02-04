import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { LeadDocument } from './leadDocument.entity';
import { LeadProvider } from './leadProvider.entity';
import { User } from '../../user/entities/user.entity';
import { PAY_TYPE } from '../types/payType';
import { LeadBuyer } from './leadBuyer.entity';
import { LeadSkill } from './leadSkill.entity';
import { LeadEngagementEnum } from '../types/leadEngagement.enum';
import { Review } from 'src/review/entity/review.entity';

@Entity()
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Generated('increment')
  reference_number: number;

  @Column()
  lead_title: string;

  @Column()
  lead_description: string;

  @Column({ type: 'enum', enum: ['Hourly', 'Bulk'] })
  payType: PAY_TYPE;
  
  @Column()
  payRate: number;

  @Column({
    default: 0
  })
  partialPayment: number;

  @Column()
  payCurrency: string;

  @Column({ nullable: true })
  referenceURL: string;

  @Column({
    type: 'enum',
    enum: LeadEngagementEnum,
  })
  lead_engagement: LeadEngagementEnum;

  @OneToMany((type) => LeadSkill, (skill) => skill.lead, {
    nullable: false,
    cascade: true,
  })
  @JoinColumn()
  skills: LeadSkill[];

  @OneToMany((type) => LeadDocument, (document) => document.lead, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn()
  documents: LeadDocument[];

  @OneToOne((type) => LeadBuyer, (leadBuyer) => leadBuyer.lead, {
    cascade: true,
  })
  buyer: LeadBuyer;

  @OneToMany((type) => LeadProvider, (leadProvider) => leadProvider.lead, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn()
  providers: LeadProvider[];

  @OneToOne(() => Review, (review) => review.id)
  @JoinColumn()
  review: Review;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
