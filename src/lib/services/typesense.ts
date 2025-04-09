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
