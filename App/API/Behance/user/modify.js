import { domain } from '^/App/Utilities';

import * as avatorConfig from '^/App/API/Behance/avator';
import experience from '^/App/API/Behance/experience';

const userExperiences = async username => {
  const { result } = await experience(username);

  return result;
}

const modify = async (props, keepOrigin) => {
  try {
    const { username } = props;

    const avator = `${domain}${avatorConfig.route}`;

    const experience = await userExperiences(props.username);

    if (!keepOrigin) {
      delete props.links;
      delete props.images;
      delete props.id;
      delete props.stats;
      delete props.twitters;
      delete props.username;
      
      delete props.has_social_links;
    }

    if (experience.length === 0) {
      return { ...props, avator };
    }

    return { ...props, avator, experience };
  } catch (error) {
    console.log(error.stack);
  }
}

export { modify };
export default modify;
