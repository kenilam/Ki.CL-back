import request from 'request';

import Core from './Core';

class Behance extends Core {
  constructor (database) {
    super(database);

    this.username = this.username.bind(this);
  }

  async user (username) {
    const URI = await this.URI(`users/${username}`);

    let { user } = await this.fetch(URI);

    user = await this.modifyUser(user);

    return user;
  }

  async experience (username) {
    const URI = await this.URI(`users/${username}/work_experience`);

    const { work_experience } = await this.fetch(URI);

    return work_experience;
  }

  async projects (username) {
    const URI = await this.URI(`users/${username}/projects`);

    let { projects } = await this.fetch(URI);

    projects = await Promise.all(
      projects.map(
        async project => {
          project = await this.modifyProject(project);

          return project;
        }
      )
    );

    return projects;
  }

  async project (projectId) {
    const URI = await this.URI(`projects/${projectId}`);

    let { project } = await this.fetch(URI);

    project = await this.modifyProject(project);

    return project;
  }

  async projectComments (projectId) {
    const URI = await this.URI(`projects/${projectId}/comments`);

    const { comments } = await this.fetch(URI);

    return comments;
  }

  async avator (username, pathOnly) {
    const { avator } = await this.user(username);

    return request(avator);
  }

  async modifyUser (props) {
    if (!props) {
      return props;
    }

    const { username } = props;

    const experience = await this.experience(username);

    delete props.images;
    delete props.id;
    delete props.username;
    delete props.has_social_links;
    delete props.stats;
    delete props.links;
    delete props.twitters;

    return { ...props, experience };
  }

  async modifyProject (props) {
    const { id } = props;

    const comments = await this.projectComments(id);

    if (!props) {
      return props;
    }

    const cover = props.covers.original;

    delete props.canvas_width;
    delete props.colors;
    delete props.conceived_on;
    delete props.covers;
    delete props.creator_id;
    delete props.ditor_version;
    delete props.editor_version;
    delete props.mature_access;
    delete props.mature_content;
    delete props.owners;
    delete props.privacy;
    delete props.short_url;
    delete props.slug;
    delete props.styles;

    if (comments.length === 0) {
      return props;
    }

    return { ...props, comments, cover };
  }
}

export default Behance;
