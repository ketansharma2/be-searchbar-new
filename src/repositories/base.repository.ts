import type {
  Model,
  FilterQuery,
  UpdateQuery,
  QueryOptions,
  HydratedDocument,
} from 'mongoose';

/**
 * Generic data-access wrapper around a Mongoose model.
 *
 * Services depend on repositories (not on Mongoose directly), which keeps the
 * persistence concern isolated (Repository Pattern) and makes services trivial
 * to unit-test against a fake repository.
 */
export class BaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  create(data: Partial<T>): Promise<HydratedDocument<T>> {
    return this.model.create(data) as unknown as Promise<HydratedDocument<T>>;
  }

  findById(id: string): Promise<HydratedDocument<T> | null> {
    return this.model.findById(id).exec();
  }

  findOne(filter: FilterQuery<T>): Promise<HydratedDocument<T> | null> {
    return this.model.findOne(filter).exec();
  }

  find(
    filter: FilterQuery<T>,
    options: QueryOptions<T> = {}
  ): Promise<HydratedDocument<T>[]> {
    return this.model.find(filter, null, options).exec();
  }

  count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  updateById(
    id: string,
    update: UpdateQuery<T>
  ): Promise<HydratedDocument<T> | null> {
    return this.model.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  deleteById(id: string): Promise<HydratedDocument<T> | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  deleteMany(filter: FilterQuery<T>): Promise<{ deletedCount?: number }> {
    return this.model.deleteMany(filter).exec();
  }
}
