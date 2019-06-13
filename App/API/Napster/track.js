import Core from './Core';

import { route } from './sound';

const track = async (id, keepOrigin) => {
  try {
    const { tracks } = await Core.fetch(`tracks/${id}`);
    
    const track = tracks[0];
  
    track.url = `${route}${track.id}`;
    
    if (!keepOrigin) {
      delete track.previewURL;
    }
    
    return track;
  } catch (error) {
    console.log(error.stack);
  }
}

export { route };
export default track;
