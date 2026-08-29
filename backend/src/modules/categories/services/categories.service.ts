import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { SubCategory } from '../entities/sub-category.entity';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepo: Repository<SubCategory>,
  ) {}

  async onModuleInit() {
    try {
      await this.seedDefaultCategories();
    } catch (err: any) {
      this.logger.warn(`Categories seeding notice: ${err?.message || err}`);
    }
  }

  async findAll(): Promise<Category[]> {
    const categories = await this.categoryRepo.find({
      where: { isActive: true },
      order: { order: 'ASC', name: 'ASC' },
      relations: { subCategories: true },
    });

    // Sort subcategories by order
    return categories.map((cat) => {
      if (cat.subCategories && cat.subCategories.length > 0) {
        cat.subCategories = cat.subCategories
          .filter((sub) => sub.isActive)
          .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
      }
      return cat;
    });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoryRepo.findOne({
      where: { slug, isActive: true },
      relations: { subCategories: true },
    });
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
