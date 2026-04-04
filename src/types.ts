export interface FormState {
  wilaya: string;
  moughataa: string;
  name: string;
  whatsapp: string;
  educationLevel: string;
  lastCertificate: string;
  field: string;
  yearsOfService: string;
  location: {
    latitude: number | null;
    longitude: number | null;
  };
  q1: string;
  q2: string[];
  q3: string[];
  q4: string[];
  q5: string[];
  q6: string[];
  q7: string[];
}
