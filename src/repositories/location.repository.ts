import { Location, type ILocation } from '../models/Location';
import { BaseRepository } from './base.repository';

class LocationRepository extends BaseRepository<ILocation> {
  constructor() {
    super(Location);
  }

  /**
   * Get all active locations sorted by city name
   */
  async getActiveLocations(): Promise<ILocation[]> {
    return this.model.find({ isActive: true })
      .sort({ city: 1 })
      .exec();
  }

  /**
   * Get locations by state
   */
  async getLocationsByState(state: string): Promise<ILocation[]> {
    return this.model.find({ 
      state: { $regex: state, $options: 'i' },
      isActive: true 
    })
    .sort({ city: 1 })
    .exec();
  }

  /**
   * Search locations by city or state
   */
  async searchLocations(query: string): Promise<ILocation[]> {
    return this.model.find({
      $or: [
        { city: { $regex: query, $options: 'i' } },
        { state: { $regex: query, $options: 'i' } },
      ],
      isActive: true,
    })
    .limit(10)
    .exec();
  }

  /**
   * Find or create a location
   */
  async findOrCreate(city: string, state: string): Promise<ILocation> {
    let location = await this.model.findOne({ city, state }).exec();
    if (!location) {
      location = await this.model.create({ city, state });
    }
    return location;
  }
}

export const locationRepository = new LocationRepository();