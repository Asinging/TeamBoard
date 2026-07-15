import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Task, TaskDocument } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private projectsService: ProjectsService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(
    projectId: string,
    dto: CreateTaskDto,
    userId: string,
  ): Promise<TaskDocument> {
    // Validates the user is a member of the project — throws if not
    await this.projectsService.findOne(projectId, userId);

    const task = await this.taskModel.create({
      ...dto,
      project: new Types.ObjectId(projectId),
      createdBy: new Types.ObjectId(userId),
      assignee: dto.assignee ? new Types.ObjectId(dto.assignee) : null,
    });

    // Internal event — in a microservice architecture this becomes a message queue publish
    this.eventEmitter.emit('task.created', { task, userId });

    return task;
  }

  async findAll(projectId: string, userId: string): Promise<TaskDocument[]> {
    await this.projectsService.findOne(projectId, userId);

    return this.taskModel
      .find({ project: new Types.ObjectId(projectId) })
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskDocument> {
    await this.projectsService.findOne(projectId, userId);

    const task = await this.taskModel
      .findOne({ _id: taskId, project: new Types.ObjectId(projectId) })
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .exec();

    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto,
    userId: string,
  ): Promise<TaskDocument> {
    const task = await this.findOne(projectId, taskId, userId);
    Object.assign(task, dto);
    const updated = await task.save();

    this.eventEmitter.emit('task.updated', { task: updated, userId });

    return updated;
  }

  async remove(
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<void> {
    const task = await this.findOne(projectId, taskId, userId);
    await task.deleteOne();

    this.eventEmitter.emit('task.deleted', { taskId, projectId, userId });
  }
}
