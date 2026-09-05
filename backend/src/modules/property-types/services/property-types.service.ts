import {
  Injectable,
  OnModuleInit,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyType } from '../entities/property-type.entity';
import { SubCategory } from '../../categories/entities/sub-category.entity';
import { Reel } from '../../reels/entities/reel.entity';
import {
  CreatePropertyTypeDto,
  UpdatePropertyTypeDto,
} from '../dto/property-type.dto';

@Injectable()
export class PropertyTypesService implements OnModuleInit {
  private readonly logger = new Logger(PropertyTypesService.name);

  constructor(
    @InjectRepository(PropertyType)
    private readonly propertyTypeRepo: Repository<PropertyType>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepo: Repository<SubCategory>,
    @InjectRepository(Reel)
    private readonly reelRepo: Repository<Reel>,
  ) {}

  async onModuleInit() {
    try {
      await this.seedDefaultPropertyTypes();
    } catch (err: any) {
      this.logger.warn(`Property types seeding notice: ${err?.message || err}`);
    }
  }

  /**
   * Used by mobile app and web reel uploader: returns active property types
   * Optionally filtered by subCategoryId or subCategorySlug
   */
  async findAll(
    subCategoryId?: string,
    subCategorySlug?: string,
  ): Promise<PropertyType[]> {
    let resolvedSubId = subCategoryId;

    if (!resolvedSubId && subCategorySlug) {
      const sub = await this.subCategoryRepo.findOne({
        where: { slug: subCategorySlug, isActive: true },
      });
      if (sub) {
        resolvedSubId = sub.id;
      }
    }

    const where: any = { isActive: true };
    if (resolvedSubId) {
      where.subCategoryId = resolvedSubId;
    }

    return this.propertyTypeRepo.find({
      where,
      order: { order: 'ASC', name: 'ASC' },
      relations: { subCategory: { category: true } },
    });
  }

  /**
   * Used by Admin Panel: returns all property types (both active and inactive) with linked reel counts
   */
  async findAllAdmin(subCategoryId?: string): Promise<any[]> {
    const where: any = {};
    if (subCategoryId) {
      where.subCategoryId = subCategoryId;
    }

    const types = await this.propertyTypeRepo.find({
      where,
      order: { order: 'ASC', name: 'ASC' },
      relations: { subCategory: { category: true } },
    });

    const result = await Promise.all(
      types.map(async (pt) => {
        // Count reels linked to this property type by name, slug or id
        const reelsCount = await this.reelRepo.count({
          where: [
            { propertyType: pt.name },
            { propertyType: pt.slug },
            { propertyType: pt.id },
          ],
        });

        return {
          ...pt,
          reelsCount,
        };
      }),
    );

    return result;
  }

  async findById(id: string): Promise<PropertyType | null> {
    return this.propertyTypeRepo.findOne({
      where: { id },
      relations: { subCategory: { category: true } },
    });
  }

  async findBySlug(slug: string): Promise<PropertyType | null> {
    return this.propertyTypeRepo.findOne({
      where: { slug, isActive: true },
      relations: { subCategory: { category: true } },
    });
  }

  async create(dto: CreatePropertyTypeDto): Promise<PropertyType> {
    if (dto.subCategoryId) {
      const subCategory = await this.subCategoryRepo.findOne({
        where: { id: dto.subCategoryId },
      });
      if (!subCategory) {
        throw new NotFoundException(
          `Subcategory with ID '${dto.subCategoryId}' not found.`,
        );
      }
    }

    // Check slug conflict within the same subcategory or globally
    const existing = await this.propertyTypeRepo.findOne({
      where: dto.subCategoryId
        ? { slug: dto.slug, subCategoryId: dto.subCategoryId }
        : { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `A property type with slug '${dto.slug}' already exists in this scope.`,
      );
    }

    const propertyType = this.propertyTypeRepo.create({
      name: dto.name,
      slug: dto.slug,
      subCategoryId: dto.subCategoryId || null,
      icon: dto.icon || null,
      description: dto.description || null,
      order: dto.order ?? 0,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.propertyTypeRepo.save(propertyType);
    return this.findById(saved.id) as Promise<PropertyType>;
  }

  async update(id: string, dto: UpdatePropertyTypeDto): Promise<PropertyType> {
    const propertyType = await this.propertyTypeRepo.findOne({ where: { id } });
    if (!propertyType) {
      throw new NotFoundException(`Property type with ID '${id}' not found.`);
    }

    if (dto.subCategoryId !== undefined) {
      if (dto.subCategoryId) {
        const subCategory = await this.subCategoryRepo.findOne({
          where: { id: dto.subCategoryId },
        });
        if (!subCategory) {
          throw new NotFoundException(
            `Subcategory with ID '${dto.subCategoryId}' not found.`,
          );
        }
        propertyType.subCategoryId = dto.subCategoryId;
      } else {
        propertyType.subCategoryId = null;
      }
    }

    if (dto.slug && dto.slug !== propertyType.slug) {
      const targetSubId =
        dto.subCategoryId !== undefined
          ? dto.subCategoryId
          : propertyType.subCategoryId;
      const existing = await this.propertyTypeRepo.findOne({
        where: targetSubId
          ? { slug: dto.slug, subCategoryId: targetSubId }
          : { slug: dto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `A property type with slug '${dto.slug}' already exists in this scope.`,
        );
      }
      propertyType.slug = dto.slug;
    }

    if (dto.name !== undefined) propertyType.name = dto.name;
    if (dto.icon !== undefined) propertyType.icon = dto.icon;
    if (dto.description !== undefined) propertyType.description = dto.description;
    if (dto.order !== undefined) propertyType.order = dto.order;
    if (dto.isActive !== undefined) propertyType.isActive = dto.isActive;

    await this.propertyTypeRepo.save(propertyType);
    return this.findById(id) as Promise<PropertyType>;
  }

  /**
   * Smart deletion:
   * If any reel is linked to this property type, it CANNOT be hard deleted.
   * Instead, it is deactivated (isActive = false) so it won't be shown in the app for future video uploads.
   */
  async delete(id: string): Promise<{
    success: boolean;
    deactivated: boolean;
    linkedReelsCount: number;
    message: string;
  }> {
    const propertyType = await this.propertyTypeRepo.findOne({ where: { id } });
    if (!propertyType) {
      throw new NotFoundException(`Property type with ID '${id}' not found.`);
    }

    // Check linked reels
    const linkedReelsCount = await this.reelRepo.count({
      where: [
        { propertyType: propertyType.name },
        { propertyType: propertyType.slug },
        { propertyType: propertyType.id },
      ],
    });

    if (linkedReelsCount > 0) {
      propertyType.isActive = false;
      await this.propertyTypeRepo.save(propertyType);
      return {
        success: true,
        deactivated: true,
        linkedReelsCount,
        message: `Property type is linked with ${linkedReelsCount} video(s) and cannot be deleted permanently. It has been deactivated so it will not appear for new video uploads.`,
      };
    }

    // If no linked reels, delete permanently
    await this.propertyTypeRepo.remove(propertyType);
    return {
      success: true,
      deactivated: false,
      linkedReelsCount: 0,
      message: 'Property type deleted permanently.',
    };
  }

  private async seedDefaultPropertyTypes() {
    // Wait briefly or check if subcategories are available
    const subCategories = await this.subCategoryRepo.find();
    if (subCategories.length === 0) {
      return;
    }

    const subMap = new Map<string, SubCategory>();
    for (const sub of subCategories) {
      subMap.set(sub.slug, sub);
    }

    // Subcategory-specific property types mapping
    const typesBySubCategory: Record<
      string,
      Array<{ name: string; slug: string; icon: string; description: string; order: number }>
    > = {
      flat: [
        { name: '1 BHK', slug: '1_bhk', icon: 'home_outlined', description: '1 Bedroom Hall Kitchen Apartment', order: 1 },
        { name: '2 BHK', slug: '2_bhk', icon: 'home_outlined', description: '2 Bedroom Hall Kitchen Apartment', order: 2 },
        { name: '3 BHK', slug: '3_bhk', icon: 'home_outlined', description: '3 Bedroom Hall Kitchen Apartment', order: 3 },
        { name: '4+ BHK', slug: '4_plus_bhk', icon: 'home_outlined', description: '4 or more Bedroom Luxury Apartment', order: 4 },
        { name: 'Studio Flat', slug: 'studio_flat', icon: 'home_outlined', description: 'Compact Studio Unit', order: 5 },
        { name: 'Penthouse', slug: 'flat_penthouse', icon: 'villa_outlined', description: 'Top Floor Luxury Penthouse', order: 6 },
      ],
      duplex: [
        { name: 'Standard Duplex', slug: 'standard_duplex', icon: 'villa_outlined', description: 'Two floor connected residential home', order: 1 },
        { name: 'Luxury Duplex', slug: 'luxury_duplex', icon: 'villa_outlined', description: 'High-end designer duplex with terrace', order: 2 },
        { name: 'Penthouse Duplex', slug: 'penthouse_duplex', icon: 'villa_outlined', description: 'Top floors duplex with skyline views', order: 3 },
      ],
      villa: [
        { name: 'Independent Villa', slug: 'independent_villa', icon: 'villa_outlined', description: 'Stand-alone private luxury villa', order: 1 },
        { name: 'Gated Community Villa', slug: 'gated_villa', icon: 'villa_outlined', description: 'Secure gated society villa', order: 2 },
        { name: 'Row House', slug: 'row_house', icon: 'villa_outlined', description: 'Connected row villa', order: 3 },
        { name: 'Bungalow', slug: 'bungalow', icon: 'villa_outlined', description: 'Spacious independent bungalow', order: 4 },
      ],
      penthouse: [
        { name: 'Duplex Penthouse', slug: 'duplex_penthouse', icon: 'villa_outlined', description: 'Two-tier penthouse with deck', order: 1 },
        { name: 'Terrace Penthouse', slug: 'terrace_penthouse', icon: 'deck_outlined', description: 'Penthouse with private rooftop lawn', order: 2 },
        { name: 'Sky Villa', slug: 'sky_villa', icon: 'villa_outlined', description: 'Ultra-luxury high rise sky villa', order: 3 },
      ],
      studio_apartment: [
        { name: 'Furnished Studio', slug: 'furnished_studio', icon: 'home_outlined', description: 'Fully furnished studio apartment', order: 1 },
        { name: 'Semi-Furnished Studio', slug: 'semi_furnished_studio', icon: 'home_outlined', description: 'Semi furnished ready-to-move studio', order: 2 },
        { name: 'Serviced Studio', slug: 'serviced_studio', icon: 'business_outlined', description: 'Managed serviced studio suite', order: 3 },
      ],
      office_cabin: [
        { name: 'Private Director Cabin', slug: 'private_director_cabin', icon: 'business_outlined', description: 'Executive private cabin', order: 1 },
        { name: 'Manager Cabin', slug: 'manager_cabin', icon: 'business_outlined', description: 'Mid-level management workspace', order: 2 },
        { name: 'Client Meeting Cabin', slug: 'client_meeting_cabin', icon: 'business_outlined', description: 'Private client discussion cabin', order: 3 },
      ],
      conference_room: [
        { name: 'Boardroom', slug: 'boardroom', icon: 'business_outlined', description: 'Large board meeting conference room', order: 1 },
        { name: 'Meeting Room', slug: 'meeting_room', icon: 'business_outlined', description: 'Small to medium huddle room', order: 2 },
      ],
      shop_retail: [
        { name: 'Retail Store', slug: 'retail_store', icon: 'business_outlined', description: 'High street retail commercial shop', order: 1 },
        { name: 'Mall Outlet', slug: 'mall_outlet', icon: 'business_outlined', description: 'Shopping mall branded outlet', order: 2 },
        { name: 'Corner Shop', slug: 'corner_shop', icon: 'business_outlined', description: 'Corner facing prime retail shop', order: 3 },
      ],
      residential_plot: [
        { name: 'Gated Layout Plot', slug: 'gated_layout_plot', icon: 'terrain_outlined', description: 'Approved plot in gated society', order: 1 },
        { name: 'Corner Plot', slug: 'corner_plot', icon: 'terrain_outlined', description: 'Two side open corner plot', order: 2 },
        { name: 'Independent Land', slug: 'independent_land', icon: 'terrain_outlined', description: 'Standalone residential plot', order: 3 },
      ],
      commercial_plot: [
        { name: 'Commercial Land', slug: 'commercial_land', icon: 'terrain_outlined', description: 'Main road commercial approved plot', order: 1 },
        { name: 'SCO Plot', slug: 'sco_plot', icon: 'business_outlined', description: 'Shop-cum-Office designated plot', order: 2 },
      ],
      farmhouse: [
        { name: 'Luxury Farmhouse', slug: 'luxury_farmhouse', icon: 'agriculture_outlined', description: 'Developed luxury farmhouse estate', order: 1 },
        { name: 'Agri Farm Plot', slug: 'agri_farm_plot', icon: 'agriculture_outlined', description: 'Gated farmland boundary plot', order: 2 },
      ],
    };

    let seededCount = 0;

    for (const [subSlug, types] of Object.entries(typesBySubCategory)) {
      const sub = subMap.get(subSlug);
      if (!sub) continue;

      for (const t of types) {
        const existing = await this.propertyTypeRepo.findOne({
          where: { slug: t.slug, subCategoryId: sub.id },
        });

        if (!existing) {
          const newType = this.propertyTypeRepo.create({
            name: t.name,
            slug: t.slug,
            subCategoryId: sub.id,
            icon: t.icon,
            description: t.description,
            order: t.order,
            isActive: true,
          });
          await this.propertyTypeRepo.save(newType);
          seededCount++;
        }
      }
    }

    // Also link legacy property types if they have no subCategoryId and match a subcategory
    const legacyTypes = await this.propertyTypeRepo.find({
      where: { subCategoryId: null as any },
    });
    for (const leg of legacyTypes) {
      if (leg.slug === 'residential' && subMap.has('flat')) {
        leg.subCategoryId = subMap.get('flat')!.id;
        await this.propertyTypeRepo.save(leg);
      } else if (leg.slug === 'commercial' && subMap.has('office_cabin')) {
        leg.subCategoryId = subMap.get('office_cabin')!.id;
        await this.propertyTypeRepo.save(leg);
      } else if (leg.slug === 'villa' && subMap.has('villa')) {
        leg.subCategoryId = subMap.get('villa')!.id;
        await this.propertyTypeRepo.save(leg);
      } else if (leg.slug === 'plot_land' && subMap.has('residential_plot')) {
        leg.subCategoryId = subMap.get('residential_plot')!.id;
        await this.propertyTypeRepo.save(leg);
      }
    }

    if (seededCount > 0) {
      this.logger.log(
        `✅ Seeded ${seededCount} subcategory-specific property types.`,
      );
    }
  }
}
