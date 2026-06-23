export type NyulFeatureKey = "rabbit-network" | "person-finder" | "fourth-volume" | "meet-someone";

export type NyulIdentitySession = {
  identityToken: string;
  publicId: string;
  displayName: string;
  createdAt: string;
};

export type NyulTickerMessage = {
  id: string;
  body: string;
  created_at: string;
};

export type NyulFeedEntry = {
  id: string;
  body: string;
  source_type: "story" | "secret" | "admin_note";
  created_at: string;
};

export type NyulRabbitPost = {
  id: string;
  message: string;
  created_at: string;
  public_id: string | null;
};
