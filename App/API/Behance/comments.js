import Core from './Core';

import { modify } from './user';

const comments = async projectId => {
  try {
    let { comments } = await Core.fetch(`projects/${projectId}/comments`);

    comments = await Promise.all(
      comments.map(async comment => {
        const user = await modify(comment.user);

        return { ...comment, user };
      })
    );

    return comments;
  } catch (error) {
    console.log(error.stack);
  }
}

export default comments;
