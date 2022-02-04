import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Organization {
  @Exclude()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'int', default: 0 })
  totalEmployees: number;

  @Column({ nullable: true, default: '' })
  vatOrPan: string;

  @Column({ nullable: true, default: '' })
  officeContactNumber: string;

  @Column({ nullable: true, default: '' })
  officeAddress1: string;

  @Column({ nullable: true, default: '' })
  officeAddress2: string;

  @Column({ nullable: true, default: '' })
  officeCity: string;

  @Column({ nullable: true, default: '' })
  officeState: string;

  @Column({ nullable: true, default: '' })
  officeZip: string;

  @Column({ nullable: true, default: '' })
  officeCountry: string;

  @Column({ nullable: true, default: '' })
  officeBio: string;

  @Column({ nullable: true, default: 0 })
  officePayRate: number;

  @Column({ nullable: true, default: '' })
  officePayType: string;

  @Column({ nullable: true, default: '' })
  officePayCurrency: string;

  @Column({ nullable: true, default: '' })
  officeEngagement: string;

  @Exclude()
  @OneToOne((type) => User, (user) => user.organization)
  @JoinColumn()
  admin: User;
}
