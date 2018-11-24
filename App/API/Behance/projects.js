import Core from './Core';

import project from './project';

const projects = async () => {
  try {
    const username = await Core.username();
    
    let { projects, http_code } = await Core.fetch(`users/${username}/projects`);

    projects = projects && await Promise.all(
      projects.map(async ({ id }) => await project(id))
    );

    return { result : projects, http_code };
  } catch (error) {
    console.log(error.stack);
  }
}

export default projects;
