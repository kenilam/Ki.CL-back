import Core from './Core';

import { modify } from './user';

const comments = async projectId => {
  try {
    let { comments, http_code } = await Core.fetch(`projects/${projectId}/comments`);

    comments = comments && await Promise.all(
      comments.map(async comment => {
        const user = await modify(comment.user);

        return { ...comment, user };
      })
    );

    return { result : comments, http_code };
  } catch (error) {
    console.log(error.stack);
  }
}

export default comments;
