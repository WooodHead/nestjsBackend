import { Lead } from 'src/lead/entities/lead.entity';
import { User } from 'src/user/entities/user.entity';
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
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne((type) => Lead, (lead) => lead.id)
  @JoinColumn()
  lead: Lead;

  @OneToOne((type) => User, (user) => user.id, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn()
  provider: User;

  @OneToOne((type) => User, (user) => user.id, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn()
  buyer: User;

  @Column({ type: 'float', nullable: true })
  buyerRating: number;

  @Column({ nullable: true })
  buyerReview: string;

  @Column({ type: 'float', nullable: true })
  providerRating: number;

  @Column({ nullable: true })
  providerReview: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
