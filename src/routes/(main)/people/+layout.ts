import type { LayoutLoad } from './$types';

const end = /\/([^/]+)$/;
function donothing(_:any){}
export const load: LayoutLoad = ({ route: {id}, url }) => {
  let currentTab = end.exec(id!)![1]; // I solemnly swear this will not be null.
  donothing(url.pathname); // Force the layout to reload when the path changes.
  return {
    currentTab
  }
}
