export function acceptLanguage(preferred: string): string {
  const tags = [...new Set([preferred, ...navigator.languages])].filter((tag) => {
    return tag !== '';
  });

  return tags
    .map((tag, index) => {
      if (index === 0) {
        return tag;
      }

      return `${tag};q=${Math.max(10 - index, 1) / 10}`;
    })
    .join(',');
}
