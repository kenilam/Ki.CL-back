import { domain } from '^/App/Utilities';

import { route, path } from './src';

const module = (props, index, keepOrigin) => {
  const { project_id } = props;

  if (props.sizes) {
    props.src = path(project_id, index);
  }

  if (!keepOrigin) {
    if (props.dimensions) {
      props = { ...props, ...props.dimensions.original };
    }

    delete props.alignment;
    delete props.dimensions;
    delete props.id;
    delete props.sizes;

    delete props.caption_alignment;
    delete props.full_bleed;
    delete props.project_id;
  }

  return props;
}

export default module;
