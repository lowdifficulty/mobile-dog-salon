declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId?: string) => Promise<SquarePayments>;
    };
  }
}

interface SquarePayments {
  card: () => Promise<SquareCard>;
}

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<SquareTokenResult>;
  destroy?: () => Promise<void>;
}

interface SquareTokenResult {
  status: "OK" | string;
  token?: string;
  errors?: Array<{ message: string }>;
}

export {};
