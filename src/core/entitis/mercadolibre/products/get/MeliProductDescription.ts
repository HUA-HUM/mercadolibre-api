export interface MeliProductDescriptionSnapshot {
  url?: string;
  width?: number;
  height?: number;
  status?: string;
}

export interface MeliProductDescription {
  text?: string;
  plain_text?: string;
  last_updated?: string;
  date_created?: string;
  snapshot?: MeliProductDescriptionSnapshot;
}
