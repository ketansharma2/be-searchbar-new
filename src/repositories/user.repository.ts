import type { FilterQuery } from 'mongoose';
import { User, type IUser } from '../models/User';
import { BaseRepository } from './base.repository';
import type { PaginationParams } from '../utils/pagination';

class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  /** Look up by email, optionally including the (normally hidden) password. */
  findByEmail(email: string, withPassword = false): Promise<IUser | null> {
    const query = this.model.findOne({ email: email.toLowerCase().trim() });
    if (withPassword) query.select('+password');
    return query.exec();
  }

  emailExists(email: string, excludeId?: string): Promise<boolean> {
    const filter: FilterQuery<IUser> = { email: email.toLowerCase().trim() };
    if (excludeId) filter._id = { $ne: excludeId };
    return this.model.exists(filter).then((doc) => Boolean(doc));
  }

  /** Paginated, filtered list of users (used by Recruiter Management). */
  async findPaginated(
    filter: FilterQuery<IUser>,
    pagination: PaginationParams
  ): Promise<{ items: IUser[]; total: number }> {
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }
}

export const userRepository = new UserRepository();
