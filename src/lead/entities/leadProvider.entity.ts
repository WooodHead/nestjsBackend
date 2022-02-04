import { User } from '../../user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Lead } from './lead.entity';
import { ProviderStatus } from '../utils/providerStatus';

@Entity()
export class LeadProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne((type) => Lead, (lead) => lead.providers, { onDelete: 'CASCADE' })
  lead: Lead;

  @OneToOne((type) => User, { createForeignKeyConstraints: false })
  @JoinColumn()
  provider: User;

  @Column({ type: 'enum', enum: ProviderStatus })
  status: ProviderStatus;

  @Column({ default: 'something letter type' })
  coverLetter: string;

  @CreateDateColumn()
  createdAt: Date;
}
