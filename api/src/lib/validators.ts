import { z } from "zod";

export const SlugParam = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Invalid slug format"),
});

export const IdParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const PostcodeParam = z.object({
  postcode: z.string().regex(/^\d{5}$/, "Postcode must be a 5-digit number"),
});

export const SearchQuery = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(["region", "district", "ward", "street"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const AutocompleteQuery = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});
