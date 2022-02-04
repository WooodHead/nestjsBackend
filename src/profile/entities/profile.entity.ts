import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '../../user/entities/user.entity';
import { SocialMediaProperties } from '../type/socialMediaProperties';
import { PROFILE_VERIFICATION_TYPE } from '../type/profileVerificationType';
import { UserSkill } from './user-skill.entity';

@Entity()
export class Profile {
  @Exclude()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Exclude()
  @OneToOne((type) => User, (user) => user.profile, { nullable: false })
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  jobTitle: string;

  @OneToMany((type) => UserSkill, (skill) => skill.profile, {
    cascade: true,
    nullable: false,
  })
  @JoinColumn()
  skills: UserSkill[];

  @Column({ type: 'date', nullable: true })
  dob: Date;

  @Column({ nullable: true })
  mobile: string;

  @Column({ nullable: true })
  address1: string;

  @Column({ nullable: true })
  address2: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  zip: string;

  @Column({ nullable: true })
  country: string;

  @Column({
    type: 'enum',
    enum: ['Verified', 'Not Verified', 'Verification Pending'],
    default: 'Not Verified',
  })
  verificationStatus: PROFILE_VERIFICATION_TYPE;

  @Column({ type: 'int', nullable: true, default: 0 })
  payRate: number;

  @Column({ default: 'NPR' })
  payCurrency: string;

  @Column({ default: 'Hourly' })
  payType: string;

  @Column({ default: 'Part Time' })
  engagement: string;

  @Column({ type: 'jsonb', nullable: true })
  socialMediaLinks: SocialMediaProperties;

  @Column({ default: 0 })
  stepper: number;

  @Exclude()
  @Column({ default: false })
  profileComplete: boolean;

  @Exclude()
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @CreateDateColumn()
  createdAt: Date;
}
