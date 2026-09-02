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
   * Used by mobile app and web reel uploader: returns only active property types
   */
  async findAll(): Promise<PropertyType[]> {
    return this.propertyTypeRepo.find({
      where: { isActive: true },
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Used by Admin Panel: returns all property types (both active and inactive) with linked reel counts
   */
  async findAllAdmin(): Promise<any[]> {
    const types = await this.propertyTypeRepo.find({
      order: { order: 'ASC', name: 'ASC' },
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
    return this.propertyTypeRepo.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<PropertyType | null> {
    return this.propertyTypeRepo.findOne({ where: { slug, isActive: true } });
  }

  async create(dto: CreatePropertyTypeDto): Promise<PropertyType> {
    const existing = await this.propertyTypeRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `A property type with slug '${dto.slug}' already exists.`,
      );
    }

    const propertyType = this.propertyTypeRepo.create({
      name: dto.name,
      slug: dto.slug,
      icon: dto.icon || null,
      description: dto.description || null,
      order: dto.order ?? 0,
      isActive: dto.isActive ?? true,
    });

    return this.propertyTypeRepo.save(propertyType);
  }

  async update(id: string, dto: UpdatePropertyTypeDto): Promise<PropertyType> {
    const propertyType = await this.propertyTypeRepo.findOne({ where: { id } });
    if (!propertyType) {
      throw new NotFoundException(`Property type with ID '${id}' not found.`);
    }

    if (dto.slug && dto.slug !== propertyType.slug) {
      const existing = await this.propertyTypeRepo.findOne({
        where: { slug: dto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `A property type with slug '${dto.slug}' already exists.`,
        );
      }
      propertyType.slug = dto.slug;
    }

    if (dto.name !== undefined) propertyType.name = dto.name;
    if (dto.icon !== undefined) propertyType.icon = dto.icon;
    if (dto.description !== undefined) propertyType.description = dto.description;
    if (dto.order !== undefined) propertyType.order = dto.order;
    if (dto.isActive !== undefined) propertyType.isActive = dto.isActive;

    return this.propertyTypeRepo.save(propertyType);
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
    const count = await this.propertyTypeRepo.count();
    if (count > 0) return;

    this.logger.log('🌱 Seeding default Real Estate property types...');

    const defaultData = [
      {
        name: 'Residential',
        slug: 'residential',
        icon: 'home_outlined',
        description: 'Residential houses, flats, apartments and villas',
        order: 1,
      },
      {
        name: 'Commercial',
        slug: 'commercial',
        icon: 'business_outlined',
        description: 'Offices, retail stores, showrooms and commercial complexes',
        order: 2,
      },
      {
        name: 'Plot / Land',
        slug: 'plot_land',
        icon: 'terrain_outlined',
        description: 'Plots, open lands, and layout sites',
        order: 3,
      },
      {
        name: 'Industrial',
        slug: 'industrial',
        icon: 'factory_outlined',
        description: 'Warehouses, factories, industrial sheds and workshops',
        order: 4,
      },
      {
        name: 'Agricultural',
        slug: 'agricultural',
        icon: 'agriculture_outlined',
        description: 'Agricultural lands, farms, orchards and plantations',
        order: 5,
      },
      {
        name: 'Villa',
        slug: 'villa',
        icon: 'villa_outlined',
        description: 'Luxury independent villas, bungalows, and farmhouses',
        order: 6,
      },
    ];

    for (const item of defaultData) {
      const type = this.propertyTypeRepo.create({
        name: item.name,
        slug: item.slug,
        icon: item.icon,
        description: item.description,
        order: item.order,
        isActive: true,
      });
      await this.propertyTypeRepo.save(type);
    }

    this.logger.log('✅ Default property types seeded successfully.');
  }
}
