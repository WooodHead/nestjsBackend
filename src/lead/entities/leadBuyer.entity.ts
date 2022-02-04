import { User } from 'src/user/entities/user.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BuyerStatus } from '../utils/buyerStatus';
import { Lead } from './lead.entity';

@Entity()
export class LeadBuyer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne((type) => User, {
    cascade: false,
    createForeignKeyConstraints: false,
  })
  @JoinColumn()
  buyer: User;

  @Column({ type: 'enum', enum: BuyerStatus })
  status: BuyerStatus;

  @OneToOne((type) => Lead, (lead) => lead.buyer, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  lead: Lead;
}
