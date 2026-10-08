/** An svg as a data URI for an <img>: quotes made single, the rest escaped as little as URLs allow. */
export const svgUri = (svg: string) =>
  `data:image/svg+xml,${svg.replace(/"/g, "'").replace(/[\r\n%#()<>?[\\\]^`{|}]/g, encodeURIComponent)}`;
