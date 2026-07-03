import type { FilterQuery } from 'mongoose';
import { Candidate, type ICandidate, type IRemark } from '../models/Candidate';
import { BaseRepository } from './base.repository';
import type { PaginationParams } from '../utils/pagination';

class CandidateRepository extends BaseRepository<ICandidate> {
  constructor() {
    super(Candidate);
  }

  /**
   * Hybrid search: full-text relevance (when `text` is provided) combined with
   * hard field filters, sorted by text score then recency, paginated.
   */
  async search(
    filter: FilterQuery<ICandidate>,
    text: string | undefined,
    pagination: PaginationParams
  ): Promise<{ items: ICandidate[]; total: number }> {
    const finalFilter: FilterQuery<ICandidate> = { ...filter };
    if (text) finalFilter.$text = { $search: text };

    const query = this.model.find(finalFilter);
    if (text) {
      query
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 });
    } else {
      query.sort({ createdAt: -1 });
    }

    const [items, total] = await Promise.all([
      query.skip(pagination.skip).limit(pagination.limit).exec(),
      this.model.countDocuments(finalFilter).exec(),
    ]);
    return { items, total };
  }

  addRemark(id: string, remark: IRemark): Promise<ICandidate | null> {
    return this.model
      .findByIdAndUpdate(id, { $push: { remarks: remark } }, { new: true })
      .exec();
  }

  /** Dedupe lookup used by ingestion (email / mobile / unique_id). */
  findDuplicate(params: {
    email?: string;
    mobile?: string;
    unique_id?: string;
  }): Promise<ICandidate | null> {
    const or: Record<string, unknown>[] = [];
    if (params.unique_id) or.push({ unique_id: params.unique_id });
    if (params.email) or.push({ email: params.email.toLowerCase().trim() });
    if (params.mobile) or.push({ mobile: params.mobile.trim() });
    if (or.length === 0) return Promise.resolve(null);
    return this.model.findOne({ $or: or }).exec();
  }
}

export const candidateRepository = new CandidateRepository();
