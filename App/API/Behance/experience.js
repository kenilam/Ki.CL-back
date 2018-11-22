import Core from './Core';

const experience = async username => {
  try {
    username = username || await Core.username();

    const { work_experience } = await Core.fetch(`users/${username}/work_experience`);

    return work_experience;
  } catch (error) {
    console.log(error.stack);
  }
}

export default experience;
