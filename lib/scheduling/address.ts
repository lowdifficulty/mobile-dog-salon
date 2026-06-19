type AddressFields = {
  address: string;
  city: string;
  zipCode?: string;
};

export function formatAppointmentAddress({
  address,
  city,
  zipCode,
}: AddressFields): string {
  const zip = zipCode?.trim();
  return zip ? `${address}, ${city}, ${zip}` : `${address}, ${city}`;
}

export function isValidZipCode(zipCode: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zipCode.trim());
}
