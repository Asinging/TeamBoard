import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

export enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, default: '' })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  // Direct members (personal projects or per-project additions)
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];

  // Optional team — when set, ALL team members can access this project
  @Prop({ type: Types.ObjectId, ref: 'Team', default: null })
  team: Types.ObjectId | null;

  @Prop({ enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  status: ProjectStatus;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
