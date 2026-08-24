export type FrameType = "first_frame" | "last_frame";
export type AssetRole = "reference" | "detail" | "exclude" | FrameType;
export type VariantMode = "single" | "multi_color";
export type VariantStrategy = "target_only" | "lineup" | "transition";

export type VideoModel = {
  id: string;
  canonical_slug?: string | null;
  name: string;
  description?: string | null;
  supported_durations: number[];
  supported_resolutions: string[];
  supported_aspect_ratios: string[];
  supported_frame_images: FrameType[];
  supported_sizes?: string[] | null;
  generate_audio?: boolean | null;
  seed?: boolean | number | null;
  pricing_skus?: Record<string, string | number> | null;
  allowed_passthrough_parameters?: string[];
  fallback?: boolean;
};

export type UploadedAsset = {
  id: string;
  name: string;
  type: string;
  size: number;
  role: AssetRole;
  note: string;
  variant: string;
  url: string;
};

export type CreativeState = {
  preset: string;
  category: string;
  campaignGoal: string;
  productDescription: string;
  environment: string;
  lighting: string;
  tone: string;
  camera: string;
  motion: string;
  palette: string;
  talent: string;
  language: string;
  dialect: string;
  delivery: string;
  script: string;
  negative: string;
  brandConstraints: string;
  variantMode: VariantMode;
  variantStrategy: VariantStrategy;
  targetVariant: string;
};

export type VideoSubmitRequest = {
  model: string;
  prompt: string;
  duration: number;
  resolution?: string;
  aspect_ratio?: string;
  generate_audio?: boolean;
  seed?: number;
  firstFrameId?: string;
  lastFrameId?: string;
  referenceIds?: string[];
  provider?: Record<string, unknown>;
};

export type VideoJob = {
  id: string;
  polling_url?: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled" | "expired";
  generation_id?: string | null;
  unsigned_urls?: string[];
  usage?: { cost?: number; is_byok?: boolean };
  error?: string | null;
};
