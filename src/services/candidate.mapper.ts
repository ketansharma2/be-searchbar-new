/**
 * Maps arbitrary spreadsheet headers to canonical candidate fields via
 * synonym matching (PRD §3.3), and transforms a raw row into a candidate
 * insert payload.
 */

export type CanonicalField =
  | 'unique_id'
  | 'name'
  | 'email'
  | 'mobile'
  | 'gender'
  | 'location'
  | 'qualification'
  | 'resumeUrl'
  | 'portal'
  | 'portalDate'
  | 'experience'
  | 'relevantExp'
  | 'designation'
  | 'recentCompany'
  | 'applyDate'
  | 'callingDate'
  | 'currCTC'
  | 'expCTC'
  | 'topSkills'
  | 'skillsAll'
  | 'companyNamesAll'
  | 'feedback'
  | 'jdBrief';

const SYNONYMS: Record<CanonicalField, string[]> = {
  unique_id: ['uniqueid', 'id', 'candidateid', 'systemid'],
  name: ['name', 'candidatename', 'fullname'],
  email: ['email', 'emailid', 'mail', 'emailaddress'],
  mobile: ['mobile', 'phone', 'mobilenumber', 'mobileno', 'contact', 'contactnumber', 'phonenumber'],
  gender: ['gender', 'sex'],
  location: ['location', 'city', 'currentlocation', 'joblocation'],
  qualification: ['qualification', 'highestqualification', 'education'],
  resumeUrl: ['resumeurl', 'resume', 'cv', 'cvlink', 'resumelink', 'drivelink'],
  portal: ['portal', 'source', 'resumesource', 'jobportal'],
  portalDate: ['portaldate', 'sourcedate'],
  experience: ['experience', 'totalexperience', 'exp', 'totalexp'],
  relevantExp: ['relevantexperience', 'relevantexp', 'relexp'],
  designation: ['designation', 'role', 'jobtitle', 'title', 'position'],
  recentCompany: ['recentcompany', 'currentcompany', 'company', 'lastcompany', 'presentcompany'],
  applyDate: ['applydate', 'applicationdate', 'appliedon'],
  callingDate: ['callingdate', 'calldate'],
  currCTC: ['currentctc', 'currctc', 'ctc', 'presentctc'],
  expCTC: ['expectedctc', 'expctc'],
  topSkills: ['topskills', 'keyskills', 'primaryskills'],
  skillsAll: ['skills', 'skillset', 'allskills', 'skill'],
  companyNamesAll: ['companies', 'companynames', 'allcompanies', 'companynamesall'],
  feedback: ['feedback'],
  jdBrief: ['jdbrief', 'jd', 'jobdescription', 'jobbrief'],
};

/** Required logical columns per the PRD (skills = topSkills OR skillsAll). */
export const REQUIRED_LOGICAL_COLUMNS = [
  'name',
  'email',
  'mobile',
  'location',
  'skills',
  'resumeUrl',
] as const;

function normalize(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export type ColumnMap = Partial<Record<CanonicalField, string>>;

/** header text → canonical field (first synonym match wins). */
export function buildColumnMap(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  for (const header of headers) {
    const norm = normalize(header);
    for (const field of Object.keys(SYNONYMS) as CanonicalField[]) {
      if (map[field]) continue;
      if (SYNONYMS[field].includes(norm)) {
        map[field] = header;
        break;
      }
    }
  }
  return map;
}

/** Which required logical columns are missing from the mapped headers. */
export function missingRequiredColumns(map: ColumnMap): string[] {
  const missing: string[] = [];
  for (const col of REQUIRED_LOGICAL_COLUMNS) {
    if (col === 'skills') {
      if (!map.skillsAll && !map.topSkills) missing.push('skills');
    } else if (!map[col as CanonicalField]) {
      missing.push(col);
    }
  }
  return missing;
}

function splitList(raw: string): string[] {
  return raw
    .split(/[,;|/\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toNumber(raw: string): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function toDate(raw: string): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export interface MappedCandidate {
  unique_id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  gender?: string;
  location?: string;
  qualification?: string;
  resumeUrl?: string;
  portal?: string;
  portalDate?: Date;
  experience?: string;
  relevantExp?: number;
  designation?: string;
  recentCompany?: string;
  applyDate?: Date;
  callingDate?: Date;
  currCTC?: number;
  expCTC?: number;
  topSkills?: string[];
  skillsAll?: string[];
  companyNamesAll?: string[];
  feedback?: string;
  jdBrief?: string;
}

/** Transform one raw row (keyed by original header) into a candidate payload. */
export function rowToCandidate(row: Record<string, string>, map: ColumnMap): MappedCandidate {
  const get = (field: CanonicalField): string => {
    const header = map[field];
    return header ? (row[header] ?? '').trim() : '';
  };

  return {
    unique_id: get('unique_id') || undefined,
    name: get('name') || undefined,
    email: get('email') || undefined,
    mobile: get('mobile') || undefined,
    gender: get('gender') || undefined,
    location: get('location') || undefined,
    qualification: get('qualification') || undefined,
    resumeUrl: get('resumeUrl') || undefined,
    portal: get('portal') || undefined,
    portalDate: toDate(get('portalDate')),
    experience: get('experience') || undefined,
    relevantExp: toNumber(get('relevantExp')),
    designation: get('designation') || undefined,
    recentCompany: get('recentCompany') || undefined,
    applyDate: toDate(get('applyDate')),
    callingDate: toDate(get('callingDate')),
    currCTC: toNumber(get('currCTC')),
    expCTC: toNumber(get('expCTC')),
    topSkills: get('topSkills') ? splitList(get('topSkills')) : undefined,
    skillsAll: get('skillsAll') ? splitList(get('skillsAll')) : undefined,
    companyNamesAll: get('companyNamesAll') ? splitList(get('companyNamesAll')) : undefined,
    feedback: get('feedback') || undefined,
    jdBrief: get('jdBrief') || undefined,
  };
}
