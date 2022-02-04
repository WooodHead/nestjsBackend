import { Bank } from 'src/bank/entities/bank.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { User } from '../../user/entities/user.entity';

  
  @Entity()
  export class ProviderPaymentDetails {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    account_number: string;
  
    @Column()
    account_name: string;
    
    @ManyToOne((type) => Bank, (Bank) => Bank.id)
    @JoinColumn()
    bank: Bank;

    @Column({ default: false , type : 'boolean'})
    isPrimary: boolean;

    @Column()
    remarks: string;

    @ManyToOne((type) => User, (user) => user.id)
    @JoinColumn()
    user: User;
    
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;

  }
  
  