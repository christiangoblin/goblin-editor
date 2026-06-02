export const nanoid = (len = 12) =>
  Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, len)
