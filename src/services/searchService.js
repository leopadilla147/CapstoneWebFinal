import { Client } from 'typesense';

const typesenseClient = new Client({
  nodes: [{
    host: 'https://uavahrbpauntxkngqzza.supabase.co', // Local or cloud
    port: 8108,
    protocol: 'http'
  }],
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhdmFocmJwYXVudHhrbmdxenphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDYwMTYsImV4cCI6MjA3Mjk4MjAxNn0.D2RXM3_06PE2exCjZBp3zhglqX0Kv38FmP_-RsM98wk',
});

export const searchTheses = async (query, filters = {}) => {
  try {
    const searchParameters = {
      q: query,
      query_by: 'title,author,abstract,college',
      filter_by: buildFilters(filters),
      sort_by: buildSort(filters.sortBy, filters.sortOrder),
      per_page: 50,
      highlight_full_fields: 'title,author,abstract',
      highlight_start_tag: '<mark class="bg-yellow-200 px-1 rounded">',
      highlight_end_tag: '</mark>'
    };

    const results = await typesenseClient
      .collections('theses')
      .documents()
      .search(searchParameters);

    return results;
  } catch (error) {
    console.error('Typesense search error:', error);
    throw error;
  }
};

const buildFilters = (filters) => {
  const filterParts = [];
  if (filters.college) filterParts.push(`college:=${filters.college}`);
  if (filters.batch) filterParts.push(`batch:=${filters.batch}`);
  return filterParts.join(' && ');
};

const buildSort = (sortBy, sortOrder) => {
  const order = sortOrder === 'desc' ? ':desc' : '';
  return `${sortBy}${order}`;
};