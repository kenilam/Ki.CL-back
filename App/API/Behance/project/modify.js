import comments from '^/App/API/Behance/comments';

import { path } from './cover';
import module from './module';

const projetcComments = async id => {
  const { result } = await comments(id);

  return result;
}

const modify = async (props, keepOrigin) => {
  try {
    const { id } = props;

    if (!props) {
      return props;
    }

    const comments = await projetcComments(id);
    
    const cover = path(id);

    if (!keepOrigin) {
      delete props.canvas_width;
      delete props.colors;
      delete props.conceived_on;
      delete props.covers;
      delete props.owners;
      delete props.privacy;
      delete props.slug;
      delete props.styles;
      
      delete props.creator_id;
      delete props.ditor_version;
      delete props.editor_version;
      delete props.mature_access;
      delete props.mature_content;
      delete props.short_url;
    }

    props.modules = props.modules.map((mdl, index) => module(mdl, index, keepOrigin));

    if (comments.length === 0) {
      return { ...props, cover };
    }

    return { ...props, cover, comments };
  } catch (error) {
    console.log(error.stack);
  }
}

export default modify;
