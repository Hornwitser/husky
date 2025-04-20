export const prerender = true;
export const csr = true;
export const ssr = false;

export function load() {
  return {
    // Provide empty data for the root layout
    people: false,
    character: '',
    channel: ''
  };
}
