import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
  ) {}

  async getForUser(userId: string) {
    const uid = new Types.ObjectId(userId);

    const teams = await this.teamModel.find({ members: uid }, '_id').lean();
    const teamIds = teams.map((t) => t._id);

    const projects = await this.projectModel
      .find({ $or: [{ members: uid }, { team: { $in: teamIds } }] }, '_id')
      .lean();
    const projectIds = projects.map((p) => p._id);

    const taskAgg = await this.taskModel.aggregate<{ _id: string; count: number }>([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const tasks = { todo: 0, in_progress: 0, done: 0 };
    for (const row of taskAgg) {
      (tasks as Record<string, number>)[row._id] = row.count;
    }

    return { projects: projects.length, teams: teams.length, tasks };
  }
}
