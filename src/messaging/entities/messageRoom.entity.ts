import { User } from '../../user/entities/user.entity';
import {
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  Entity,
  JoinColumn,
} from 'typeorm';

@Entity()
export class MessageRoom {
  @PrimaryGeneratedColumn('uuid')
  roomId: string;

  @OneToOne((type) => User, { createForeignKeyConstraints: false })
  @JoinColumn()
  buyer: User;

  @OneToOne((type) => User, { createForeignKeyConstraints: false })
  @JoinColumn()
  provider: User;
}
