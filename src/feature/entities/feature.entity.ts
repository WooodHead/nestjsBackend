import { Exclude } from "class-transformer";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Feature_Type } from "../types/feature";


@Entity()
export class Feature {
    @Exclude()
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({
        type: 'enum',
        enum: Feature_Type,
    })
    feature_type: Feature_Type;

    @Column()
    description: string;

    @Exclude()
    @UpdateDateColumn({ select: false })
    updatedAt: Date;

    @Exclude()
    @CreateDateColumn({ select: false })
    createdAt: Date;
}