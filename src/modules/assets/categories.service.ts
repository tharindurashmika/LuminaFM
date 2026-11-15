import tenantPrisma from '../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../tenant/tenant.context';
import { validateNoHierarchyCycle, ForeignKeyViolationError } from './hierarchy.validator';

export interface CreateAssetCategoryDto {
  parentCategoryId?: string | null;
  code: string;
  name: string;
  description?: string;
}

export interface UpdateAssetCategoryDto {
  parentCategoryId?: string | null;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

export class AssetCategoriesService {
  async listCategories() {
    return tenantPrisma.assetCategory.findMany({
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCategoryById(categoryId: string) {
    const category = await tenantPrisma.assetCategory.findFirst({
      where: { id: categoryId },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true } },
        _count: { select: { assets: true, assetModels: true } },
      },
    });

    if (!category) {
      throw { status: 404, code: 'CATEGORY_NOT_FOUND', message: `AssetCategory with ID '${categoryId}' not found.` };
    }

    return category;
  }

  async createCategory(dto: CreateAssetCategoryDto) {
    const organizationId = requireCurrentTenantId();
    const normalizedCode = dto.code.trim().toUpperCase();

    if (dto.parentCategoryId) {
      const parent = await tenantPrisma.assetCategory.findFirst({
        where: { id: dto.parentCategoryId },
      });
      if (!parent) {
        throw new ForeignKeyViolationError(
          'parentCategoryId',
          dto.parentCategoryId,
          `Parent category '${dto.parentCategoryId}' not found in active organization.`
        );
      }
    }

    return tenantPrisma.assetCategory.create({
      data: {
        organizationId,
        parentCategoryId: dto.parentCategoryId || null,
        code: normalizedCode,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async updateCategory(categoryId: string, dto: UpdateAssetCategoryDto) {
    const existing = await this.getCategoryById(categoryId);

    // Prevent circular reference if updating parentCategoryId
    if (dto.parentCategoryId !== undefined && dto.parentCategoryId !== existing.parentCategoryId) {
      await validateNoHierarchyCycle(
        'AssetCategory',
        categoryId,
        dto.parentCategoryId,
        async (id) => {
          const node = await tenantPrisma.assetCategory.findFirst({
            where: { id },
            select: { parentCategoryId: true },
          });
          return node?.parentCategoryId;
        }
      );

      if (dto.parentCategoryId) {
        const parent = await tenantPrisma.assetCategory.findFirst({
          where: { id: dto.parentCategoryId },
        });
        if (!parent) {
          throw new ForeignKeyViolationError(
            'parentCategoryId',
            dto.parentCategoryId,
            `Parent category '${dto.parentCategoryId}' not found in active organization.`
          );
        }
      }
    }

    return tenantPrisma.assetCategory.update({
      where: { id: categoryId },
      data: {
        ...(dto.parentCategoryId !== undefined ? { parentCategoryId: dto.parentCategoryId } : {}),
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteCategory(categoryId: string) {
    await this.getCategoryById(categoryId);

    const childCount = await tenantPrisma.assetCategory.count({
      where: { parentCategoryId: categoryId },
    });
    if (childCount > 0) {
      throw {
        status: 400,
        code: 'CATEGORY_HAS_CHILDREN',
        message: `Cannot delete asset category '${categoryId}'. It has ${childCount} child category(s).`,
      };
    }

    await tenantPrisma.assetCategory.delete({
      where: { id: categoryId },
    });

    return { success: true, message: `AssetCategory '${categoryId}' deleted successfully.` };
  }
}

export const assetCategoriesService = new AssetCategoriesService();

