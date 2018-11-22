import Core from './Core';

import project from './project';

const projects = async () => {
  try {
    const username = await Core.username();
    let { projects } = await Core.fetch(`users/${username}/projects`);

    projects = await Promise.all(
      projects.map(async ({ id }) => await project(id))
    );

    return projects;
  } catch (error) {
    console.log(error.stack);
  }
}

export default projects;
