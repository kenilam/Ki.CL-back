import Core from '^/App/API/Napster/Core';

import getTracks from './tracks';

const search = async (query, id) => {
  try {
    let {
      search: { data: { playlists } }
    } = await Core.fetch(`search?query=${query}&type=playlist&per_type_limit=5&offset=5`);
    
    const playlistWithTrackLists = await Promise.all(
      playlists.map(
        async ({ id }) => await Core.fetch(`playlists/${id}/tracks?limit=5&offset=5`)
      )
    );
    
    const tracks = await Promise.all(
      playlistWithTrackLists.map(
        async ({ tracks }) => await getTracks(tracks)
      )
    );
  
    let result = [].concat(
      ...tracks
      .map(
        tracks => [].concat( ...tracks )
      )
    );
    
    if (id) {
      result = result.filter(
        track => !id || `tra.${id}` === track.id
      )[0];
    }
    
    return { result, http_code: result.length === 0 ? 204 : 200 };
  } catch (error) {
    return { result : error.stack, http_code: 400 };
  }
}

export default search;
