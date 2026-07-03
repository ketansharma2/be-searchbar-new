import { Schema, model, Types, type Document, type Model } from 'mongoose';

/** A single education row (repeatable). */
export interface IEducation {
  degree?: string;
  institute?: string;
  passingYear?: string;
  score?: string; // percentage or CGPA
}

/**
 * A remark/feedback entry. Modelled as a thread (array) with author + time
 * per the PRD (§4.3, §8) — the legacy `remarks: String` and the real data's
 * `remarks: []` are both superseded by this richer, backwards-compatible shape.
 */
export interface IRemark {
  text: string;
  author?: Types.ObjectId;
  authorName?: string;
  authorEmail?: string;
  createdAt: Date;
}

export interface ICandidate extends Document {
  unique_id: string;

  // Basic info
  name: string;
  // The following are required by the *manual-add* API but optional at the DB
  // level so bulk-ingested rows (which often omit them) remain valid.
  email?: string;
  mobile?: string;
  gender?: string;
  location?: string;
  qualification?: string;

  // Resume
  resumeUrl?: string;
  pdfFile?: string; // stored PDF filename/key (manual-add); optional for bulk rows
  resumeText?: string; // hidden — used only for keyword search
  resumeKeywords: string[];

  // Portal
  portal?: string;
  portalDate?: Date;

  // Experience & job
  experience?: string; // e.g. "2 years"
  relevantExp?: number;
  designation?: string;
  recentCompany?: string;

  education: IEducation[];

  // Dates
  applyDate?: Date;
  callingDate?: Date;

  // CTC
  currCTC?: number;
  expCTC?: number;

  // Skills / companies
  topSkills: string[];
  skillsAll: string[];
  companyNamesAll: string[];

  // Extra
  feedback?: string;
  remarks: IRemark[];
  jdBrief?: string;

  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const educationSchema = new Schema<IEducation>(
  {
    degree: { type: String, trim: true },
    institute: { type: String, trim: true },
    passingYear: { type: String, trim: true },
    score: { type: String, trim: true },
  },
  { _id: false }
);

const remarkSchema = new Schema<IRemark>(
  {
    text: { type: String, required: true, trim: true },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, trim: true },
    authorEmail: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const candidateSchema = new Schema<ICandidate>(
  {
    // Unique system ID (auto-generated on ingest if absent).
    unique_id: { type: String, required: true, unique: true, index: true },

    // Basic info. Only name is required at the DB level; email/mobile/location/
    // qualification/designation are enforced by the manual-add validator but
    // left optional here so bulk rows that omit them still persist.
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    mobile: { type: String, trim: true },
    gender: { type: String, trim: true },
    location: { type: String, trim: true },
    qualification: { type: String, trim: true },

    // Resume
    resumeUrl: { type: String, trim: true },
    // NOTE: optional (was required in legacy). Bulk rows carry only resumeUrl;
    // the manual-add API enforces a PDF at the endpoint instead.
    pdfFile: { type: String, trim: true },
    resumeText: { type: String, select: false }, // NEVER exposed directly
    resumeKeywords: { type: [String], default: [] },

    // Portal
    portal: { type: String, trim: true },
    portalDate: { type: Date },

    // Experience & job
    experience: { type: String, trim: true },
    relevantExp: { type: Number },
    designation: { type: String, trim: true },
    recentCompany: { type: String, trim: true },

    education: { type: [educationSchema], default: [] },

    // Dates
    applyDate: { type: Date },
    callingDate: { type: Date },

    // CTC
    currCTC: { type: Number },
    expCTC: { type: Number },

    // Skills / companies
    topSkills: { type: [String], default: [] },
    skillsAll: { type: [String], default: [] },
    companyNamesAll: { type: [String], default: [] },

    // Extra
    feedback: { type: String, trim: true },
    remarks: { type: [remarkSchema], default: [] },
    jdBrief: { type: String, trim: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        // Never leak the raw resume text or version key.
        delete (ret as Record<string, unknown>).resumeText;
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

// ── Indexes for filtering + dedupe lookups ────────────────────────────────
candidateSchema.index({ email: 1 });
candidateSchema.index({ mobile: 1 });
candidateSchema.index({ location: 1 });
candidateSchema.index({ designation: 1 });
candidateSchema.index({ relevantExp: 1 });
candidateSchema.index({ createdAt: -1 });

// ── Weighted full-text index (groundwork for hybrid search in Feature 3) ──
candidateSchema.index(
  {
    name: 'text',
    designation: 'text',
    topSkills: 'text',
    skillsAll: 'text',
    companyNamesAll: 'text',
    recentCompany: 'text',
    location: 'text',
    resumeKeywords: 'text',
    resumeText: 'text',
  },
  {
    name: 'candidate_text',
    weights: {
      name: 10,
      designation: 8,
      topSkills: 8,
      skillsAll: 5,
      recentCompany: 4,
      companyNamesAll: 3,
      location: 3,
      resumeKeywords: 4,
      resumeText: 1,
    },
  }
);

export const Candidate: Model<ICandidate> = model<ICandidate>('Candidate', candidateSchema);
