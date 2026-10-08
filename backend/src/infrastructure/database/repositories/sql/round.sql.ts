export const VIEW_SELECT = `
  SELECT r.id, r.creator_id, r.start_at, r.end_at, r.total_score, r.created_at, u.login AS creator_login
  FROM rounds r
  JOIN users u ON u.id = r.creator_id
`;

export const PAGE_SQL = {
  finished: `${VIEW_SELECT}
    WHERE r.end_at <= $1
      AND ($2::timestamptz IS NULL OR (r.end_at, r.id) < ($2::timestamptz, $3::uuid))
    ORDER BY r.end_at DESC, r.id DESC
    LIMIT $4`,
  current: `${VIEW_SELECT}
    WHERE r.end_at > $1
      AND ($2::timestamptz IS NULL OR (r.start_at, r.id) > ($2::timestamptz, $3::uuid))
    ORDER BY r.start_at ASC, r.id ASC
    LIMIT $4`,
};
