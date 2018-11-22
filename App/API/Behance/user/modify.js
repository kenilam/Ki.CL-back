import { domain } from '^/App/Utilities';

import * as avatorConfig from '^/App/API/Behance/avator';
import experience from '^/App/API/Behance/experience';

const modify = async (props, keepOrigin) => {
  try {
    const avator = `${domain}${avatorConfig.route}`;

    const exp = await experience(props.username);

    if (!keepOrigin) {
      delete props.links;
      delete props.images;
      delete props.id;
      delete props.stats;
      delete props.twitters;
      delete props.username;
      
      delete props.has_social_links;
    }

    if (exp.length === 0) {
      return { ...props, avator };
    }

    return { ...props, avator, experience : exp };
  } catch (error) {
    console.log(error.stack);
  }
}

export { modify };
export default modify;
