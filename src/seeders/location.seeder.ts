import mongoose from "mongoose";
import { State, City } from "country-state-city";
import { Location } from "../models/Location";
import { env } from "../config/env"; // adjust path

async function seedLocations() {
  try {
    await mongoose.connect(env.mongoUri);

    console.log("✅ Connected to MongoDB");

    await Location.deleteMany({});
    console.log("🧹 Cleared existing locations");

    const states = State.getStatesOfCountry("IN");

    const locations = [];

    for (const state of states) {
      const cities = City.getCitiesOfState("IN", state.isoCode);

      for (const city of cities) {
        locations.push({
          state: state.name,
          stateCode: state.isoCode,
          city: city.name,
          latitude: city.latitude ? Number(city.latitude) : null,
          longitude: city.longitude ? Number(city.longitude) : null,
        });
      }
    }

    const inserted = await Location.insertMany(locations);

    console.log(`✅ Seeded ${inserted.length} locations`);

    await mongoose.disconnect();

    console.log("🎉 Location seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);

    await mongoose.disconnect().catch(() => {});

    process.exit(1);
  }
}

seedLocations();