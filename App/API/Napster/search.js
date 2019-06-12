import Core from '^/App/API/Napster/Core';

const search = async query => {
  try {
    let {
      search: { data: { playlists } }
    } = await Core.fetch(`search?query=${query}&type=playlist&per_type_limit=5&offset=5`);
    
    const lists = await Promise.all(
      playlists.map(
        async ({ id }) => await Core.fetch(`playlists/${id}/tracks?limit=5&offset=5`)
      )
    );
    
    const musics = await Promise.all(
      lists.map(
        async ({ tracks }) => await Promise.all(
          tracks.map(
            async ({ id }) => await Core.fetch(`tracks/${id}`)
          )
        )
      )
    );
  
    const result = [].concat(
      ...musics.map(
        tracks => [].concat(
          ...tracks.map(
            ({ tracks }) => tracks
          )
        )
      )
    );
    
    return { result, http_code: result.length === 0 ? 204 : 200 };
  } catch (error) {
    return { result : error.stack, http_code: 400 };
  }
}

export default search;
