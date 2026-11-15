import tenantPrisma from '../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../tenant/tenant.context';
import { ForeignKeyViolationError } from './hierarchy.validator';

export interface CreateBrandDto {
  name: string;
  website?: string;
  supportContact?: string;
}

export interface CreateAssetModelDto {
  brandId: string;
  assetCategoryId: string;
  modelNumber: string;
  modelName?: string;
  specifications?: Record<string, unknown>;
}

export class BrandsModelsService {
  // BRANDS
  async listBrands() {
    return tenantPrisma.brand.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getBrandById(brandId: string) {
    const brand = await tenantPrisma.brand.findFirst({
      where: { id: brandId },
      include: {
        _count: { select: { assetModels: true, assets: true } },
      },
    });

    if (!brand) {
      throw { status: 404, code: 'BRAND_NOT_FOUND', message: `Brand with ID '${brandId}' not found.` };
    }

    return brand;
  }

  async createBrand(dto: CreateBrandDto) {
    const organizationId = requireCurrentTenantId();
    const normalizedName = dto.name.trim();

    const existing = await tenantPrisma.brand.findFirst({
      where: { name: normalizedName },
    });

    if (existing) {
      throw {
        status: 409,
        code: 'BRAND_EXISTS',
        message: `A brand with the name '${normalizedName}' already exists in this organization.`,
      };
    }

    return tenantPrisma.brand.create({
      data: {
        organizationId,
        name: normalizedName,
        website: dto.website?.trim() || null,
        supportContact: dto.supportContact?.trim() || null,
      },
    });
  }

  // ASSET MODELS
  async listAssetModels(categoryId?: string, brandId?: string) {
    return tenantPrisma.assetModel.findMany({
      where: {
        ...(categoryId ? { assetCategoryId: categoryId } : {}),
        ...(brandId ? { brandId } : {}),
      },
      include: {
        brand: { select: { id: true, name: true } },
        assetCategory: { select: { id: true, code: true, name: true } },
      },
      orderBy: { modelNumber: 'asc' },
    });
  }

  async getAssetModelById(modelId: string) {
    const model = await tenantPrisma.assetModel.findFirst({
      where: { id: modelId },
      include: {
        brand: { select: { id: true, name: true } },
        assetCategory: { select: { id: true, code: true, name: true } },
        _count: { select: { assets: true } },
      },
    });

    if (!model) {
      throw { status: 404, code: 'MODEL_NOT_FOUND', message: `AssetModel with ID '${modelId}' not found.` };
    }

    return model;
  }

  async createAssetModel(dto: CreateAssetModelDto) {
    const organizationId = requireCurrentTenantId();

    // 1. Verify brand exists within active tenant
    const brand = await tenantPrisma.brand.findFirst({
      where: { id: dto.brandId },
    });
    if (!brand) {
      throw new ForeignKeyViolationError('brandId', dto.brandId, `Brand '${dto.brandId}' not found in active organization.`);
    }

    // 2. Verify asset category exists within active tenant
    const category = await tenantPrisma.assetCategory.findFirst({
      where: { id: dto.assetCategoryId },
    });
    if (!category) {
      throw new ForeignKeyViolationError(
        'assetCategoryId',
        dto.assetCategoryId,
        `AssetCategory '${dto.assetCategoryId}' not found in active organization.`
      );
    }

    const normalizedModelNumber = dto.modelNumber.trim();

    return tenantPrisma.assetModel.create({
      data: {
        organizationId,
        brandId: dto.brandId,
        assetCategoryId: dto.assetCategoryId,
        modelNumber: normalizedModelNumber,
        modelName: dto.modelName?.trim() || null,
        specifications: (dto.specifications || {}) as any,
      },
      include: {
        brand: { select: { id: true, name: true } },
        assetCategory: { select: { id: true, code: true, name: true } },
      },
    });
  }
}

export const brandsModelsService = new BrandsModelsService();

