import { Skill, type ISkill } from '../models/Skill';
import { BaseRepository } from './base.repository';

class SkillRepository extends BaseRepository<ISkill> {
  constructor() {
    super(Skill);
  }

  /**
   * Get all active skills sorted by name
   */
  async getActiveSkills(): Promise<ISkill[]> {
    return this.model.find({ isActive: true })
      .sort({ name: 1 })
      .exec();
  }

  /**
   * Get skills by category
   */
  async getSkillsByCategory(category: string): Promise<ISkill[]> {
    return this.model.find({ 
      category: { $regex: category, $options: 'i' },
      isActive: true 
    })
    .sort({ name: 1 })
    .exec();
  }

  /**
   * Search skills by name
   */
  async searchSkills(query: string): Promise<ISkill[]> {
    return this.model.find({
      name: { $regex: query, $options: 'i' },
      isActive: true,
    })
    .limit(10)
    .exec();
  }

  /**
   * Find or create a skill
   */
  async findOrCreate(name: string, category?: string): Promise<ISkill> {
    let skill = await this.model.findOne({ name }).exec();
    if (!skill) {
      skill = await this.model.create({ name, category });
    }
    return skill;
  }

  /**
   * Find multiple skills by names
   */
  async findByNameIn(names: string[]): Promise<ISkill[]> {
    return this.model.find({
      name: { $in: names.map(n => new RegExp(`^${n}$`, 'i')) },
      isActive: true
    })
    .exec();
  }
}

export const skillRepository = new SkillRepository();