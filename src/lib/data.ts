import type { Activity, Area, Home, Provider, School, Workplace } from "./types";

// Marhaba geography gives context. Hub71 is an official anchor; its cost is a
// workspace allowance, not a Hub71 price. Other catalogue records need confirmation.
export const areas: Area[] = [
  { id: "reem", name: "Al Reem Island", description: "Island neighbourhood close to Hub71.", x: 65, y: 28 },
  { id: "maryah", name: "Al Maryah Island", description: "Business island anchored by Hub71.", x: 44, y: 21 },
  { id: "khalifa", name: "Khalifa City", description: "More space with longer prepared journeys to Hub71.", x: 36, y: 78 },
  { id: "raha", name: "Al Raha Beach", description: "Waterfront alternative with prepared Hub71 travel times.", x: 76, y: 67 },
];

export const homes: Home[] = [
  { id: "reed-apartment", name: "Reed Apartment", areaId: "reem", bedrooms: 2, furnished: false, annualRent: 8_400_000, installments: 4, deposit: 420_000, description: "Two-bedroom apartment near Hub71. Confirm rent and availability." },
  { id: "reed-family", name: "Reed Family Home", areaId: "reem", bedrooms: 3, furnished: true, annualRent: 10_600_000, installments: 4, deposit: 530_000, description: "Furnished family home close to the school anchor." },
  { id: "reed-villa", name: "Reed Villa", areaId: "reem", bedrooms: 4, furnished: true, annualRent: 12_400_000, installments: 4, deposit: 620_000, description: "Larger Reem home for households with more than one child." },
  { id: "garden-flat", name: "Garden Flat", areaId: "khalifa", bedrooms: 2, furnished: false, annualRent: 6_800_000, installments: 4, deposit: 340_000, description: "Lower-rent home that preserves cash and adds office travel." },
  { id: "garden-house", name: "Garden House", areaId: "khalifa", bedrooms: 3, furnished: false, annualRent: 7_800_000, installments: 4, deposit: 390_000, description: "Larger Khalifa home with a prepared school-bus connection." },
  { id: "garden-compound", name: "Garden Compound", areaId: "khalifa", bedrooms: 4, furnished: false, annualRent: 9_200_000, installments: 4, deposit: 460_000, description: "Four-bedroom compound option for larger households." },
  { id: "tide-apartment", name: "Tide Apartment", areaId: "raha", bedrooms: 2, furnished: true, annualRent: 9_800_000, installments: 4, deposit: 490_000, description: "Furnished apartment near the swimming school." },
  { id: "tide-family", name: "Tide Family Home", areaId: "raha", bedrooms: 3, furnished: true, annualRent: 11_800_000, installments: 4, deposit: 590_000, description: "Larger waterfront home used to show higher housing commitment." },
  { id: "quay-flat", name: "Quay Flat", areaId: "maryah", bedrooms: 2, furnished: false, annualRent: 11_000_000, installments: 4, deposit: 550_000, description: "Apartment near the founder workplace on Al Maryah." },
  { id: "quay-studio", name: "Quay Studio Desk Home", areaId: "maryah", bedrooms: 1, furnished: true, annualRent: 5_900_000, installments: 4, deposit: 295_000, description: "Compact Maryah option for solo founders near Hub71." },
  { id: "quay-family", name: "Quay Family Home", areaId: "maryah", bedrooms: 3, furnished: true, annualRent: 13_200_000, installments: 4, deposit: 660_000, description: "Premium Maryah home used to show a hard budget conflict." },
];

export const schools: School[] = [
  { id: "reed-school", name: "Reed Learning School", areaId: "reem", curriculum: "British", minAge: 5, maxAge: 17, annualFee: 3_000_000, installments: 3, swimming: true, busAreas: { reem: "met", maryah: "met", khalifa: "not-met", raha: "unknown" }, admission: "met", description: "School planning option with swimming. Confirm fees, places and activity provision." },
  { id: "garden-school", name: "Garden Learning School", areaId: "khalifa", curriculum: "British", minAge: 5, maxAge: 16, annualFee: 2_400_000, installments: 3, swimming: false, busAreas: { reem: "not-met", maryah: "not-met", khalifa: "met", raha: "met" }, admission: "met", description: "School planning option with external swimming available nearby." },
  { id: "tide-school", name: "Tide Learning School", areaId: "raha", curriculum: "British", minAge: 5, maxAge: 17, annualFee: 2_800_000, installments: 3, swimming: true, busAreas: { reem: "unknown", maryah: "unknown", khalifa: "met", raha: "met" }, admission: "met", description: "School planning option with an illustrative swimming programme." },
  { id: "quay-school", name: "Quay Learning School", areaId: "maryah", curriculum: "British", minAge: 5, maxAge: 18, annualFee: 4_200_000, installments: 3, swimming: true, busAreas: { reem: "met", maryah: "met", khalifa: "not-met", raha: "not-met" }, admission: "unknown", description: "School planning option whose admission stage needs confirmation." },
  { id: "horizon-school", name: "Horizon Learning School", areaId: "reem", curriculum: "American", minAge: 6, maxAge: 18, annualFee: 2_600_000, installments: 3, swimming: false, busAreas: { reem: "met", maryah: "met", khalifa: "unknown", raha: "not-met" }, admission: "met", description: "Fictional American-curriculum option; stage remains an assumption to verify." },
  { id: "orchard-school", name: "Orchard Learning School", areaId: "khalifa", curriculum: "IB", minAge: 6, maxAge: 17, annualFee: 3_800_000, installments: 3, swimming: true, busAreas: { reem: "not-met", maryah: "unknown", khalifa: "met", raha: "met" }, admission: "unknown", description: "Fictional IB option with unconfirmed admissions." },
];

export const workplaces: Workplace[] = [
  { id: "harbor-lab", name: "Hub71 · startup ecosystem", areaId: "maryah", kind: "desk", monthlyCost: 180_000, sourceUrl: "https://www.hub71.com/contact", description: "Official location anchor: Al Khatem Tower, ADGM Square, Al Maryah Island. Workspace allowance is synthetic, not a Hub71 quote. Programme access, desk suitability and availability require confirmation." },
  { id: "central-studio", name: "Central Studio", areaId: "reem", kind: "private", monthlyCost: 550_000, description: "Fictional private office and partner-workplace anchor." },
  { id: "orchard-works", name: "Orchard Works", areaId: "khalifa", kind: "desk", monthlyCost: 140_000, description: "Fictional desk workspace for an alternative business base." },
];

export const activities: Activity[] = [
  { id: "garden-swim", name: "Garden Swim Club", areaId: "khalifa", monthlyCost: 35_000, kind: "swimming" },
  { id: "reed-swim", name: "Reed Swim Club", areaId: "reem", monthlyCost: 45_000, kind: "swimming" },
  { id: "tide-swim", name: "Tide Swim Club", areaId: "raha", monthlyCost: 40_000, kind: "swimming" },
];

export const providers: Provider[] = [
  { id: "school-guide", name: "Education Guide", service: "school", description: "Enquiry template. Helps prepare admissions, stage and school-bus questions. Quote required." },
  { id: "school-concierge", name: "Family Concierge", service: "school", description: "Enquiry template. Helps compare curriculum and activities. Quote required." },
  { id: "home-guide", name: "Housing Guide", service: "housing", demoPhone: "+971 50 XXX 0101", description: "Enquiry template with a placeholder contact. Helps prepare rent, deposit and move-in questions. Quote required." },
  { id: "move-concierge", name: "Move Coordinator", service: "housing", demoPhone: "+971 50 XXX 0102", description: "Enquiry template with a placeholder contact. Helps prepare utilities and arrival questions. Quote required." },
  { id: "business-guide", name: "Business Adviser", service: "business", description: "Enquiry template. Helps investigate setup routes and workplace suitability. Quote required." },
  { id: "workspace-guide", name: "Workspace Guide", service: "business", description: "Enquiry template. Helps prepare desk and office enquiries. Quote required." },
  { id: "document-guide", name: "Document Preparation Guide", service: "documents", description: "Enquiry template. Helps prepare a document checklist and certification questions. No files or passport upload in this prototype. Quote required." },
  { id: "document-concierge", name: "Relocation Document Concierge", service: "documents", description: "Enquiry template. Helps organise questions about required business and household documents. No files are collected. Quote required." },
];
