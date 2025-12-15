// utils/pagination.js
exports.getPaginationParams = (
  req,
  allowedSortFields = [],
  defaultSort = "createdAt"
) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = (page - 1) * limit;

  const sortBy = allowedSortFields.includes(req.query.sortBy)
    ? req.query.sortBy
    : defaultSort;

  const sortOrder =
    String(req.query.sortOrder || "DESC").toUpperCase() === "ASC"
      ? "ASC"
      : "DESC";

  return {
    page,
    limit,
    offset,
    sortBy,
    sortOrder,
  };
};
