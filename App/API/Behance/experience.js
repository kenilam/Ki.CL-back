import Core from './Core';

const experience = async username => {
  try {
    username = username || await Core.username();

    const { work_experience, http_code } = await Core.fetch(`users/${username}/work_experience`);
    
    return { result : work_experience, http_code };
  } catch (error) {
    console.log(error.stack);
  }
}

export default experience;
