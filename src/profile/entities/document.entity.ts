import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Document {
  @Exclude()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Exclude()
  @OneToOne((type) => User, (user) => user.documents)
  @JoinColumn()
  user: User;

  // The columns hold the key for S3 object.
  @Column({ nullable: true })
  identity: string;

  @Column({ nullable: true })
  resume: string;

  @Column({ nullable: true })
  academics: string;

  @Column({ nullable: true })
  achievement: string;
}
