import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UsersService } from '../users/users.service';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private usersService: UsersService,
    private teamsService: TeamsService,
  ) {}

  create(dto: CreateProjectDto, ownerId: string): Promise<ProjectDocument> {
    const ownerObjectId = new Types.ObjectId(ownerId);
    return this.projectModel.create({
      name: dto.name,
      description: dto.description,
      owner: ownerObjectId,
      members: [ownerObjectId],
      team: dto.teamId ? new Types.ObjectId(dto.teamId) : null,
    });
  }

  async findAllForUser(userId: string): Promise<ProjectDocument[]> {
    // Get every team this user belongs to
    const teamIds = await this.teamsService.getTeamIdsForUser(userId);

    // Return personal projects (direct member) + team projects
    return this.projectModel
      .find({
        $or: [
          { members: new Types.ObjectId(userId) },
          { team: { $in: teamIds } },
        ],
      })
      .populate('owner', 'name email')
      .populate('team', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<ProjectDocument> {
    const project = await this.projectModel
      .findById(id)
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .populate('team', 'name description')
      .exec();

    if (!project) throw new NotFoundException('Project not found');
    await this.assertAccess(project, userId);
    return project;
  }

  async update(id: string, dto: UpdateProjectDto, userId: string): Promise<ProjectDocument> {
    const project = await this.findOne(id, userId);
    this.assertOwner(project, userId);
    Object.assign(project, dto);
    return project.save();
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id, userId);
    this.assertOwner(project, userId);
    await project.deleteOne();
  }

  async addMember(projectId: string, email: string, requesterId: string): Promise<ProjectDocument> {
    const project = await this.findOne(projectId, requesterId);
    this.assertOwner(project, requesterId);

    const newMember = await this.usersService.findByEmail(email);
    if (!newMember) throw new NotFoundException(`No user found with email ${email}`);

    const alreadyMember = (project.members as any[]).some(
      (m) => m._id?.toString() === newMember._id.toString() || m.toString() === newMember._id.toString(),
    );
    if (alreadyMember) throw new BadRequestException('User is already a member');

    project.members = [...(project.members as any[]), newMember._id] as any;
    await project.save();
    return this.findOne(projectId, requesterId);
  }

  async removeMember(projectId: string, memberId: string, requesterId: string): Promise<ProjectDocument> {
    const project = await this.findOne(projectId, requesterId);
    this.assertOwner(project, requesterId);

    if (memberId === requesterId)
      throw new BadRequestException('Owner cannot remove themselves');

    project.members = (project.members as any[]).filter(
      (m) => m._id?.toString() !== memberId && m.toString() !== memberId,
    ) as any;

    await project.save();
    return this.findOne(projectId, requesterId);
  }

  // Checks direct member OR team member
  private async assertAccess(project: ProjectDocument, userId: string): Promise<void> {
    const isDirectMember = (project.members as any[]).some(
      (m) => m._id?.toString() === userId || m.toString() === userId,
    );
    if (isDirectMember) return;

    if (project.team) {
      const teamId = (project.team as any)?._id?.toString() ?? project.team.toString();
      const isTeamMember = await this.teamsService.isUserInTeam(teamId, userId);
      if (isTeamMember) return;
    }

    throw new ForbiddenException('Access denied');
  }

  private assertOwner(project: ProjectDocument, userId: string): void {
    const ownerId = (project.owner as any)?._id?.toString() ?? project.owner.toString();
    if (ownerId !== userId)
      throw new ForbiddenException('Only the project owner can do this');
  }
}
