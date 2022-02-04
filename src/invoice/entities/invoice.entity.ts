import { Subscription } from './../../subscription/entities/subscription.entity';
import { Exclude } from 'class-transformer';
import { Lead } from 'src/lead/entities/lead.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  InvoiceStatus,
  INVOICE_CHARGES,
  INVOICE_ITEM_TYPE,
  INVOICE_TYPE,
} from '../type/invoice';
import { InvoiceHash } from 'src/payment/entities/hash.entity';

@Entity()
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invoice_number: string;

  @Column({
    type: 'enum',
    enum: ['Leads', 'Subscription'],
  })
  invoice_for: INVOICE_TYPE;

  @ManyToOne((type) => User, (user) => user.id)
  @JoinColumn()
  invoice_from: User;

  @ManyToOne((type) => User, (user) => user.id)
  @JoinColumn()
  invoice_to: User;

  @ManyToOne((type) => Lead, (lead) => lead.id)
  @JoinColumn()
  lead: Lead;

  @ManyToOne((type) => Subscription, (subscription) => subscription.id)
  @JoinColumn()
  subscription: Subscription;

  @Column({ type: 'jsonb' })
  invoice_item: INVOICE_ITEM_TYPE;

  @Column({
    type: 'jsonb',
  })
  invoice_charges: INVOICE_CHARGES[];

  @Column({ type: 'numeric', nullable: true })
  initiated_invoice_amount: Number;

  @Column({ nullable: true, type: 'numeric' })
  final_invoice_amount: Number;

  @Column({ type: 'timestamptz', nullable: true })
  created_date: Date;

  @Column({ type: 'timestamptz', nullable: true })
  due_date: Date;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
  })
  invoice_status: InvoiceStatus;

  @Column({ nullable: true })
  initial_buyer_invoice_link: string;

  @Column({ nullable: true })
  initial_invoice_link: string;

  @Column({ nullable: true })
  final_invoice_link: string;

  @Column({
    default: 'N/A',
  })
  provider_remarks: string;


  @Column({
    default: 'N/A',
  })
  buyer_remarks: string;

  @Exclude()
  @UpdateDateColumn({ select: false })
  updatedAt: Date;

  @Exclude()
  @CreateDateColumn({ select: false })
  createdAt: Date;

  @OneToOne((type) => InvoiceHash, (invoiceHash) => invoiceHash.invoice, {
    onDelete: 'CASCADE',
  })
  invoiceHash: InvoiceHash;
}
