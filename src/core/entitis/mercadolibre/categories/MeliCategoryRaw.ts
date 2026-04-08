export interface MeliCategoryPathNodeRaw {
  id?: string;
  name?: string;
}

export interface MeliCategorySettingsRaw {
  [key: string]: unknown;
}

export interface MeliCategoryChannelSettingsRaw {
  channel?: string;
  settings?: {
    [key: string]: unknown;
  };
}

export interface MeliCategoryRaw {
  id?: string;
  name?: string;
  picture?: string;
  permalink?: string | null;
  total_items_in_this_category?: number;
  path_from_root?: MeliCategoryPathNodeRaw[];
  children_categories?: unknown[];
  attribute_types?: string;
  settings?: MeliCategorySettingsRaw;
  channels_settings?: MeliCategoryChannelSettingsRaw[];
  meta_categ_id?: string | null;
  attributable?: boolean;
  date_created?: string;
  [key: string]: unknown;
}
