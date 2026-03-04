export interface Region {
  name: string;
  slug: string;
}

export interface District {
  name: string;
  slug: string;
  region_slug: string;
}

export interface Ward {
  name: string;
  slug: string;
  district_slug: string;
  region_slug: string;
}

export interface Street {
  name: string;
  postcode: string;
  ward_slug: string;
  district_slug: string;
  region_slug: string;
}

export interface Location {
  type: "region" | "district" | "ward" | "street";
  name: string;
  slug?: string;
  postcode?: string;
  ward_slug?: string;
  district_slug?: string;
  region_slug?: string;
}

export interface PostcodeLookupResult {
  ward: Ward | null;
  streets: Street[];
}
