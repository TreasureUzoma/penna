export interface AuthType {
  id: string;
  email: string;
  name?: string;
  plan?: string;
}

export interface ExternalNewsletterCreate {
  id: string;
  newsletterId: string;
  name: string;
  email: string;
  keyType: string;
}

export type InsertApiKey = {
  newsletterId: string;
  publicKey: string;
  encryptedSecretKey: string;
  revokedAt?: Date;
};

export type AppBindings = {
  Variables: {
    user: AuthType;
  };
};
