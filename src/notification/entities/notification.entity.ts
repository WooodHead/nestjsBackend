import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Notifications {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne((type) => User, {
    cascade: true,
    onDelete: 'CASCADE',
    createForeignKeyConstraints: false,
  })
  @JoinColumn()
  user: User;

  @Column()
  message: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: string;
}
