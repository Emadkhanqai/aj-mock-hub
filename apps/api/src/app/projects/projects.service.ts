import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateProjectRequest,
  CreateProjectVersionRequest,
  ProjectListResponse,
  ProjectResponse,
  ProjectVersionListResponse,
  ProjectVersionResponse,
} from '@aj-mock-hub/contracts';
import {
  PrismaService,
  type Project,
  type ProjectVersion,
} from '@aj-mock-hub/database';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(input: CreateProjectRequest): Promise<ProjectResponse> {
    const project = await this.prisma.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
      },
    });
    return this.mapProject(project);
  }

  async listProjects(): Promise<ProjectListResponse> {
    const projects = await this.prisma.project.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return { items: projects.map((project) => this.mapProject(project)) };
  }

  async getProject(projectId: string): Promise<ProjectResponse> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found.',
      });
    }
    return this.mapProject(project);
  }

  async createVersion(
    projectId: string,
    input: CreateProjectVersionRequest,
  ): Promise<ProjectVersionResponse> {
    try {
      const version = await this.prisma.$transaction(async (transaction) => {
        const projects = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "projects"
          WHERE "id" = ${projectId}::uuid
          FOR UPDATE
        `;
        if (projects.length === 0) {
          throw new NotFoundException({
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found.',
          });
        }

        const latest = await transaction.projectVersion.findFirst({
          where: { projectId },
          select: { versionNumber: true },
          orderBy: { versionNumber: 'desc' },
        });

        return transaction.projectVersion.create({
          data: {
            projectId,
            versionNumber: (latest?.versionNumber ?? 0) + 1,
            label: input.label,
            instructionsSnapshot: input.instructionsSnapshot,
          },
        });
      });
      return this.mapVersion(version);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({
          code: 'VERSION_CREATION_CONFLICT',
          message: 'The version could not be numbered safely. Please retry.',
        });
      }
      throw error;
    }
  }

  async listVersions(projectId: string): Promise<ProjectVersionListResponse> {
    await this.getProject(projectId);
    const versions = await this.prisma.projectVersion.findMany({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
    });
    return { items: versions.map((version) => this.mapVersion(version)) };
  }

  async getVersion(
    projectId: string,
    versionId: string,
  ): Promise<ProjectVersionResponse> {
    const version = await this.prisma.projectVersion.findFirst({
      where: { id: versionId, projectId },
    });
    if (!version) {
      throw new NotFoundException({
        code: 'PROJECT_VERSION_NOT_FOUND',
        message: 'Project version not found.',
      });
    }
    return this.mapVersion(version);
  }

  private mapProject(project: Project): ProjectResponse {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  private mapVersion(version: ProjectVersion): ProjectVersionResponse {
    return {
      id: version.id,
      projectId: version.projectId,
      versionNumber: version.versionNumber,
      label: version.label,
      status: version.status,
      sourceType: version.sourceType,
      instructionsSnapshot: version.instructionsSnapshot,
      createdAt: version.createdAt.toISOString(),
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
