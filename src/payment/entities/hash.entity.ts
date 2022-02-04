import { Invoice } from 'src/invoice/entities/invoice.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class InvoiceHash {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne((type) => Invoice, (invoice) => invoice.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  invoice: Invoice;

  @Column()
  hashValue: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
