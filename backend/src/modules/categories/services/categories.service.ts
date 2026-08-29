import {
  Injectable,
  OnModuleInit,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { SubCategory } from '../entities/sub-category.entity';
import { Reel } from '../../reels/entities/reel.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateSubCategoryDto,
  UpdateSubCategoryDto,
} from '../dto/category.dto';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepo: Repository<SubCategory>,
    @InjectRepository(Reel)
    private readonly reelRepo: Repository<Reel>,
  ) {}

  async onModuleInit() {
    try {
      await this.seedDefaultCategories();
    } catch (err: any) {
      this.logger.warn(`Categories seeding notice: ${err?.message || err}`);
    }
  }

  /**
   * Used by mobile app: returns only active categories and their active subcategories
   */
  async findAll(): Promise<Category[]> {
    const categories = await this.categoryRepo.find({
      where: { isActive: true },
      order: { order: 'ASC', name: 'ASC' },
      relations: { subCategories: true },
    });

    return categories.map((cat) => {
      if (cat.subCategories && cat.subCategories.length > 0) {
        cat.subCategories = cat.subCategories
          .filter((sub) => sub.isActive)
          .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
      }
      return cat;
    });
  }

  /**
   * Used by Admin Panel: returns all categories (both active and inactive) with linked reel counts
   */
  async findAllAdmin(): Promise<any[]> {
    const categories = await this.categoryRepo.find({
      order: { order: 'ASC', name: 'ASC' },
      relations: { subCategories: true },
    });

    const result = await Promise.all(
      categories.map(async (cat) => {
        // Count reels linked to this category
        const catReelCount = await this.reelRepo.count({
          where: [{ category: cat.slug }, { category: cat.name }, { category: cat.id }],
        });

        const subCatsWithCounts = await Promise.all(
          (cat.subCategories || [])
            .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
            .map(async (sub) => {
              const subReelCount = await this.reelRepo.count({
                where: [{ subCategory: sub.name }, { subCategory: sub.slug }],
              });
              return {
                ...sub,
                reelsCount: subReelCount,
              };
            }),
        );

        return {
          ...cat,
          reelsCount: catReelCount,
          subCategories: subCatsWithCounts,
        };
      }),
    );

    return result;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoryRepo.findOne({
      where: { slug, isActive: true },
      relations: { subCategories: true },
    });
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoryRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `A category with slug '${dto.slug}' already exists.`,
      );
    }

    const category = this.categoryRepo.create({
      name: dto.name,
      slug: dto.slug,
      icon: dto.icon || null,
      order: dto.order ?? 0,
      isActive: dto.isActive ?? true,
    });

    return this.categoryRepo.save(category);
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found.`);
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryRepo.findOne({
        where: { slug: dto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `A category with slug '${dto.slug}' already exists.`,
        );
      }
      category.slug = dto.slug;
    }

    if (dto.name !== undefined) category.name = dto.name;
    if (dto.icon !== undefined) category.icon = dto.icon;
    if (dto.order !== undefined) category.order = dto.order;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;

    return this.categoryRepo.save(category);
  }

  /**
   * Smart deletion:
   * If any reel is linked to this category, it CANNOT be hard deleted.
   * Instead, it is deactivated (isActive = false) so it won't be shown in the app for future videos.
   */
  async deleteCategory(id: string): Promise<{
    success: boolean;
    deactivated: boolean;
    linkedReelsCount: number;
    message: string;
  }> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: { subCategories: true },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found.`);
    }

    // Check linked reels
    const linkedReelsCount = await this.reelRepo.count({
      where: [
        { category: category.slug },
        { category: category.name },
        { category: category.id },
      ],
    });

    if (linkedReelsCount > 0) {
      category.isActive = false;
      await this.categoryRepo.save(category);
      return {
        success: true,
        deactivated: true,
        linkedReelsCount,
        message: `Category is linked with ${linkedReelsCount} video(s) and cannot be deleted. It has been deactivated so it will not appear for new video uploads.`,
      };
    }

    // If no linked reels, delete category
    await this.categoryRepo.remove(category);
    return {
      success: true,
      deactivated: false,
      linkedReelsCount: 0,
      message: 'Category deleted permanently.',
    };
  }

  async createSubCategory(
    categoryId: string,
    dto: CreateSubCategoryDto,
  ): Promise<SubCategory> {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID '${categoryId}' not found.`,
      );
    }

    const subCategory = this.subCategoryRepo.create({
      categoryId,
      name: dto.name,
      slug: dto.slug,
      order: dto.order ?? 0,
      isActive: dto.isActive ?? true,
    });

    return this.subCategoryRepo.save(subCategory);
  }

  async updateSubCategory(
    subId: string,
    dto: UpdateSubCategoryDto,
  ): Promise<SubCategory> {
    const subCategory = await this.subCategoryRepo.findOne({
      where: { id: subId },
    });
    if (!subCategory) {
      throw new NotFoundException(`SubCategory with ID '${subId}' not found.`);
    }

    if (dto.name !== undefined) subCategory.name = dto.name;
    if (dto.slug !== undefined) subCategory.slug = dto.slug;
    if (dto.order !== undefined) subCategory.order = dto.order;
    if (dto.isActive !== undefined) subCategory.isActive = dto.isActive;

    return this.subCategoryRepo.save(subCategory);
  }

  /**
   * Smart deletion for subcategories:
   * If any reel is linked to this subcategory, it is deactivated instead of hard deleted.
   */
  async deleteSubCategory(subId: string): Promise<{
    success: boolean;
    deactivated: boolean;
    linkedReelsCount: number;
    message: string;
  }> {
    const subCategory = await this.subCategoryRepo.findOne({
      where: { id: subId },
    });
    if (!subCategory) {
      throw new NotFoundException(`SubCategory with ID '${subId}' not found.`);
    }

    const linkedReelsCount = await this.reelRepo.count({
      where: [
        { subCategory: subCategory.name },
        { subCategory: subCategory.slug },
      ],
    });

    if (linkedReelsCount > 0) {
      subCategory.isActive = false;
      await this.subCategoryRepo.save(subCategory);
      return {
        success: true,
        deactivated: true,
        linkedReelsCount,
        message: `Subcategory is linked with ${linkedReelsCount} video(s) and cannot be deleted. It has been deactivated so it will not appear for new video uploads.`,
      };
    }

    await this.subCategoryRepo.remove(subCategory);
    return {
      success: true,
      deactivated: false,
      linkedReelsCount: 0,
      message: 'Subcategory deleted permanently.',
    };
  }

  private async seedDefaultCategories() {
    const count = await this.categoryRepo.count();
    if (count > 0) return;

    this.logger.log('🌱 Seeding default Real Estate categories and subcategories...');

    const defaultData = [
      {
        name: 'Living Room',
        slug: 'living_room',
        icon: 'weekend_outlined',
        order: 1,
        subCategories: [
          { name: 'Flat', slug: 'flat', order: 1 },
          { name: 'Duplex', slug: 'duplex', order: 2 },
          { name: 'Villa', slug: 'villa', order: 3 },
          { name: 'Penthouse', slug: 'penthouse', order: 4 },
          { name: 'Studio Apartment', slug: 'studio_apartment', order: 5 },
        ],
      },
      {
        name: 'Entrance / Main Door',
        slug: 'entrance',
        icon: 'door_front_outlined',
        order: 2,
        subCategories: [
          { name: 'Main Gate', slug: 'main_gate', order: 1 },
          { name: 'Foyer', slug: 'foyer', order: 2 },
          { name: 'Lobby', slug: 'lobby', order: 3 },
          { name: 'Porch / Verandah', slug: 'porch', order: 4 },
        ],
      },
      {
        name: 'Kitchen',
        slug: 'kitchen',
        icon: 'kitchen_outlined',
        order: 3,
        subCategories: [
          { name: 'Modular Kitchen', slug: 'modular_kitchen', order: 1 },
          { name: 'Open Kitchen', slug: 'open_kitchen', order: 2 },
          { name: 'Dining Area', slug: 'dining_area', order: 3 },
          { name: 'Pantry / Store', slug: 'pantry_store', order: 4 },
        ],
      },
      {
        name: 'Bedroom',
        slug: 'bedroom',
        icon: 'bed_outlined',
        order: 4,
        subCategories: [
          { name: 'Master Bedroom', slug: 'master_bedroom', order: 1 },
          { name: 'Guest Bedroom', slug: 'guest_bedroom', order: 2 },
          { name: 'Kids Bedroom', slug: 'kids_bedroom', order: 3 },
        ],
      },
      {
        name: 'Bathroom & Washroom',
        slug: 'bathroom',
        icon: 'bathtub_outlined',
        order: 5,
        subCategories: [
          { name: 'Attached Bathroom', slug: 'attached_bathroom', order: 1 },
          { name: 'Common Bathroom', slug: 'common_bathroom', order: 2 },
          { name: 'Powder Room', slug: 'powder_room', order: 3 },
        ],
      },
      {
        name: 'Office & Study',
        slug: 'office',
        icon: 'business_center_outlined',
        order: 6,
        subCategories: [
          { name: 'Office Cabin', slug: 'office_cabin', order: 1 },
          { name: 'Conference Room', slug: 'conference_room', order: 2 },
          { name: 'Shop / Retail', slug: 'shop_retail', order: 3 },
          { name: 'Co-working Space', slug: 'coworking_space', order: 4 },
          { name: 'Showroom', slug: 'showroom', order: 5 },
        ],
      },
      {
        name: 'Plot & Land',
        slug: 'plot_land',
        icon: 'terrain_outlined',
        order: 7,
        subCategories: [
          { name: 'Residential Plot', slug: 'residential_plot', order: 1 },
          { name: 'Commercial Plot', slug: 'commercial_plot', order: 2 },
          { name: 'Agricultural Land', slug: 'agricultural_land', order: 3 },
          { name: 'Farmhouse', slug: 'farmhouse', order: 4 },
        ],
      },
      {
        name: 'Balcony & Terrace',
        slug: 'balcony',
        icon: 'deck_outlined',
        order: 8,
        subCategories: [
          { name: 'Balcony', slug: 'balcony', order: 1 },
          { name: 'Open Terrace', slug: 'open_terrace', order: 2 },
          { name: 'Rooftop Garden', slug: 'rooftop_garden', order: 3 },
        ],
      },
    ];

    for (const catData of defaultData) {
      const category = this.categoryRepo.create({
        name: catData.name,
        slug: catData.slug,
        icon: catData.icon,
        order: catData.order,
        isActive: true,
      });
      const savedCat = await this.categoryRepo.save(category);

      const subEntities = catData.subCategories.map((sub) =>
        this.subCategoryRepo.create({
          categoryId: savedCat.id,
          name: sub.name,
          slug: sub.slug,
          order: sub.order,
          isActive: true,
        }),
      );
      await this.subCategoryRepo.save(subEntities);
    }

    this.logger.log('✅ Default categories & subcategories seeded successfully.');
  }
}
