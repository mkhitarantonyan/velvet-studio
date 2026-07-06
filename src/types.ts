export interface Booking {
  id: string; // UUID
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  procedureId: string; // references Procedure.id
  procedureIds?: string[]; // references Procedure.id array
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  comment?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface PortfolioItem {
  id: string;
  titleEn: string;
  titleRu: string;
  titleHu: string;
  descriptionEn: string;
  descriptionRu: string;
  descriptionHu: string;
  image: string;
  categoryEn: string;
  categoryRu: string;
  categoryHu: string;
}

export interface Procedure {
  id: string; // UUID
  nameEn: string;
  nameRu: string;
  nameHu: string;
  price: number; // Numeric price in HUF
  durationMinutes: number; // Duration in minutes
  descriptionEn: string;
  descriptionRu: string;
  descriptionHu: string;
}

export interface SalonContacts {
  phone1: string;
  phone2: string;
  email: string;
  instagram: string;
  mapUrl: string;
  addressEn: string;
  addressRu: string;
  addressHu: string;
  workingHoursEn: string;
  workingHoursRu: string;
  workingHoursHu: string;
}
