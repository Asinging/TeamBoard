import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  // select: false means this field is never returned in queries unless explicitly requested
  @Prop({ required: true, select: false })
  password: string;

  @Prop({ enum: UserRole, default: UserRole.MEMBER })
  role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);
