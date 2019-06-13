import { file } from '^/App/API/Core/Utilities';

import getTrack from './track';

const route = '/api/assets/sounds/';

const sound = async id => {
  try {
    const { previewURL } = await getTrack(id, true);
    
    return await file(previewURL);
  } catch (error) {
    console.log(error.stack);
  }
}

export { route };
export default sound;
