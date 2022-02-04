import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity()
export class ProfessionalSubscription {
  @Exclude()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  organizationName: string;

  @Column()
  address: string;

  @Column()
  contactNumber: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  companyWebsite: string;

  @Column({ nullable: true })
  comment: string;

  @Exclude()
  @UpdateDateColumn({ select: false })
  updatedAt: Date;

  @Exclude()
  @CreateDateColumn({ select: false })
  createdAt: Date;
}
