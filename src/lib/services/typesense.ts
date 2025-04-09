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
import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";

/**
 * Standard Typesense client for direct API operations
 *
 * This client can be used for CRUD operations on collections, documents,
 * and for performing search queries directly against the Typesense API.
 */
export const client = new Typesense.Client({
  nodes: [
    {
      url: import.meta.env.VITE_TYPESENSE_URL,
    },
  ],
  apiKey: import.meta.env.VITE_TYPESENSE_SEARCH_ONLY_API_KEY,
  connectionTimeoutSeconds: 2,
});

/**
 * Typesense InstantSearch adapter for UI integration
 *
 * This adapter bridges Typesense with InstantSearch.js UI components,
 * allowing for faceted search, filtering, and pagination in the UI.
 */
const typesenseInstantsearchAdapter = new TypesenseInstantSearchAdapter({
  server: {
    nodes: [
      {
        url: import.meta.env.VITE_TYPESENSE_URL,
      },
    ],
    apiKey: import.meta.env.VITE_TYPESENSE_SEARCH_ONLY_API_KEY,
  },
  additionalSearchParameters: {
    query_by: "title,authorName,description,genre,tags", // Your searchable fields
  },
});

/**
 * Search client for use with InstantSearch UI components
 *
 * This client can be passed to InstantSearch components to enable
 * real-time search with faceting, filtering, and pagination.
 */
export const searchClient = typesenseInstantsearchAdapter.searchClient;
