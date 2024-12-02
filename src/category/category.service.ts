import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ActiveUserInterface } from '../common/interface/activeUserInterface';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    user: ActiveUserInterface,
  ) {
    const category = this.categoryRepository.create({
      ...createCategoryDto,
      user,
    });
    const savedCategory = await this.categoryRepository.save(category);
    delete savedCategory.user;
    return savedCategory;
  }

  async createDefaultCategory(createCategoryDto: CreateCategoryDto) {
    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  findAll(user: ActiveUserInterface) {
    return this.categoryRepository.find({ where: { user: { id: user.id } } });
  }

  findAllDefauld() {
    return this.categoryRepository.find();
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    user: ActiveUserInterface,
  ) {
    const category = await this.categoryRepository.findOne({
      where: { id, user: { id: user.id } },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    Object.assign(category, updateCategoryDto);
    return this.categoryRepository.save(category);
  }

  async remove(id: string, user: ActiveUserInterface) {
    const category = await this.categoryRepository.findOne({
      where: { id, user: { id: user.id } },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return this.categoryRepository.remove(category);
  }
}
