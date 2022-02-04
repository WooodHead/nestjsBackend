import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { PROFILE_TYPE } from '../type/profileType';
import { USER_TYPE } from '../type/userType';
import { Profile } from '../../profile/entities/profile.entity';
import { Document } from '../../profile/entities/document.entity';
import { Organization } from '../../organization/entities/organization.entity';
import { ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';

@UseInterceptors(ClassSerializerInterceptor)
@Entity()
export class User {
  @Exclude()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Generated('increment')
  reference_number: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: ['Buyer', 'Provider', 'Admin'],
  })
  userType: USER_TYPE;

  @Column({
    type: 'enum',
    enum: ['Individual', 'Organization'],
  })
  profileType: PROFILE_TYPE;

  @Column({ default: 'N/A' })
  referralCode: string;

  @Exclude()
  @Column({ type: 'boolean', default: false })
  accountActivated: boolean;

  @OneToOne((type) => Profile, (profile) => profile.user, { cascade: true })
  profile: Profile;

  @OneToOne((type) => Organization, (organization) => organization.admin)
  organization: Organization;

  @Column({ default: 'N/A' })
  identityNumber: string;

  @OneToOne((type) => Document, (document) => document.user, {
    cascade: true,
  })
  documents: Document;

  @Exclude()
  @Column({ nullable: true })
  lastLoggedIn: Date;

  @Exclude()
  @UpdateDateColumn({
    select: false,
  })
  updatedAt: Date;

  @Exclude()
  @CreateDateColumn({ select: false })
  createdAt: Date;
}
