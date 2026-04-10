function parseList(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const json = JSON.parse(value);
      return Array.isArray(json) ? json : [];
    } catch (err) {
      return [];
    }
  }

  return [];
}

module.exports = { parseList };