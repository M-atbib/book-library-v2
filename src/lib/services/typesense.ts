/**
 * Typesense Service Module
 *
 * This module provides search functionality using Typesense, a fast, typo-tolerant search engine.
 * It initializes and exports two clients:
 * - A standard Typesense client for direct API operations
 * - An InstantSearch adapter client for integration with UI search components
 *
 * The service is configured using environment variables for the Typesense URL and API key.
 */

import Typesense from "typesense";
import TypesenseInstantsearchAdapter from "typesense-instantsearch-adapter";

/**
 * Standard Typesense client for direct API operations
 *
 * This client can be used for CRUD operations on collections, documents,
 * and for performing search queries directly against the Typesense API.
 */
export const client = new Typesense.Client({
  nodes: [
    {
      host: import.meta.env.VITE_TYPESENSE_HOST,
      port: parseInt(import.meta.env.VITE_TYPESENSE_PORT),
      protocol: import.meta.env.VITE_TYPESENSE_PROTOCOL,
    },
  ],
  apiKey: import.meta.env.VITE_TYPESENSE_SEARCH_ONLY_API_KEY,
  connectionTimeoutSeconds: 2,
});

/**
 * InstantSearch adapter client for integration with UI search components
 *
 * This client is configured to work with the InstantSearch.js library,
 * providing a bridge between the Typesense search engine and the InstantSearch UI.
 */
const typesenseInstantsearchAdapter = new TypesenseInstantsearchAdapter({
  server: {
    apiKey: import.meta.env.VITE_TYPESENSE_SEARCH_ONLY_API_KEY,
    nodes: [
      {
        host: import.meta.env.VITE_TYPESENSE_HOST,
        port: parseInt(import.meta.env.VITE_TYPESENSE_PORT),
        protocol: import.meta.env.VITE_TYPESENSE_PROTOCOL,
      },
    ],
    cacheSearchResultsForSeconds: 2 * 60,
  },
  additionalSearchParameters: {
    query_by: "title,authorName,genre,tags",
    query_by_weights: "2,2,2,2",
    sort_by: "_text_match:desc",
    facet_sample_threshold: 1000,
    facet_sample_percent: 20,
    highlight_full_fields: "title,authorName,genre,tags",
    facet_by: "avgRating,genre,tags",
    max_facet_values: 20,
  },
  filterByOptions: {
    genre: { exactMatch: true },
    tags: { exactMatch: false },
    avgRating: { exactMatch: false },
  },
});
export const searchClient = typesenseInstantsearchAdapter.searchClient;
