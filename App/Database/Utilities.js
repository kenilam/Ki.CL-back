import timestamp from 'timestamp';

const oneDay = 8.64e+7;

const isOutdated = (created_on) => timestamp() - oneDay >= created_on || !created_on;

export default { isOutdated, timestamp };
