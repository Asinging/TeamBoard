import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    private usersService: UsersService,
  ) {}

  create(dto: CreateTeamDto, ownerId: string): Promise<TeamDocument> {
    const ownerObjectId = new Types.ObjectId(ownerId);
    return this.teamModel.create({
      ...dto,
      owner: ownerObjectId,
      members: [ownerObjectId],
    });
  }

  findAllForUser(userId: string): Promise<TeamDocument[]> {
    return this.teamModel
      .find({ members: new Types.ObjectId(userId) })
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<TeamDocument> {
    const team = await this.teamModel
      .findById(id)
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .exec();

    if (!team) throw new NotFoundException('Team not found');
    this.assertMember(team, userId);
    return team;
  }

  // Used by ProjectsService — no access check, just a raw lookup
  async getTeamIdsForUser(userId: string): Promise<Types.ObjectId[]> {
    const teams = await this.teamModel
      .find({ members: new Types.ObjectId(userId) }, '_id')
      .exec();
    return teams.map((t) => t._id as Types.ObjectId);
  }

  async isUserInTeam(teamId: string, userId: string): Promise<boolean> {
    const team = await this.teamModel.findById(teamId, 'members').exec();
    if (!team) return false;
    return (team.members as Types.ObjectId[]).some(
      (m) => m.toString() === userId,
    );
  }

  async update(id: string, dto: UpdateTeamDto, userId: string): Promise<TeamDocument> {
    const team = await this.findOne(id, userId);
    this.assertOwner(team, userId);
    Object.assign(team, dto);
    return team.save();
  }

  async remove(id: string, userId: string): Promise<void> {
    const team = await this.findOne(id, userId);
    this.assertOwner(team, userId);
    await team.deleteOne();
  }

  async addMember(teamId: string, email: string, requesterId: string): Promise<TeamDocument> {
    const team = await this.findOne(teamId, requesterId);
    this.assertOwner(team, requesterId);

    const newMember = await this.usersService.findByEmail(email);
    if (!newMember) throw new NotFoundException(`No user found with email ${email}`);

    const alreadyMember = (team.members as any[]).some(
      (m) => m._id?.toString() === newMember._id.toString() || m.toString() === newMember._id.toString(),
    );
    if (alreadyMember) throw new BadRequestException('User is already a team member');

    team.members = [...(team.members as any[]), newMember._id] as any;
    await team.save();

    return this.findOne(teamId, requesterId);
  }

  async removeMember(teamId: string, memberId: string, requesterId: string): Promise<TeamDocument> {
    const team = await this.findOne(teamId, requesterId);
    this.assertOwner(team, requesterId);

    if (memberId === requesterId)
      throw new BadRequestException('Owner cannot remove themselves from the team');

    team.members = (team.members as any[]).filter(
      (m) => m._id?.toString() !== memberId && m.toString() !== memberId,
    ) as any;

    await team.save();
    return this.findOne(teamId, requesterId);
  }

  private assertMember(team: TeamDocument, userId: string): void {
    const isMember = (team.members as any[]).some(
      (m) => m._id?.toString() === userId || m.toString() === userId,
    );
    if (!isMember) throw new ForbiddenException('Access denied');
  }

  private assertOwner(team: TeamDocument, userId: string): void {
    const ownerId = (team.owner as any)?._id?.toString() ?? team.owner.toString();
    if (ownerId !== userId)
      throw new ForbiddenException('Only the team owner can do this');
  }
}
