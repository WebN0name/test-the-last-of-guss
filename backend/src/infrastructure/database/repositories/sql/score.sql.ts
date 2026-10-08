export const APPLY_TAPS_SQL = `
WITH r AS (
  SELECT id,
         GREATEST(1, CEIL(EXTRACT(EPOCH FROM (LEAST(now(), end_at) - start_at))))::int * $5::int AS max_taps
  FROM rounds
  WHERE id = $1
    AND now() >= start_at
    AND now() < end_at + ($4::int * interval '1 second')
),
tap AS (
  INSERT INTO scores (round_id, user_id, taps, score)
  SELECT r.id, $2, $3::int, $3::int + 9 * ($3::int / 11)
  FROM r
  WHERE $3::int <= r.max_taps
  ON CONFLICT (round_id, user_id) DO UPDATE
  SET taps       = scores.taps + EXCLUDED.taps,
      score      = scores.score + EXCLUDED.taps + 9 * ((scores.taps + EXCLUDED.taps) / 11 - scores.taps / 11),
      updated_at = now()
  WHERE scores.taps + EXCLUDED.taps <= (SELECT max_taps FROM r)
  RETURNING round_id, user_id, taps, score, updated_at
),
bump AS (
  UPDATE rounds
  SET total_score = total_score + (SELECT $3::int + 9 * (taps / 11 - (taps - $3::int) / 11) FROM tap)
  WHERE id = $1 AND EXISTS (SELECT 1 FROM tap)
)
SELECT round_id, user_id, taps, score, updated_at FROM tap
`;

export const REGISTER_PARTICIPANT_SQL = `
INSERT INTO scores (round_id, user_id, taps, score)
SELECT r.id, $2, 0, 0
FROM rounds r
WHERE r.id = $1
  AND now() >= r.start_at
  AND now() < r.end_at + ($3::int * interval '1 second')
ON CONFLICT (round_id, user_id) DO NOTHING
`;

export const TALLY_SQL = `
SELECT r.total_score,
       w.user_id AS winner_id,
       w.login   AS winner_login,
       w.score   AS winner_score,
       m.taps    AS my_taps,
       m.score   AS my_score,
       p.list    AS standings
FROM rounds r
LEFT JOIN LATERAL (
  SELECT s.user_id, u.login, s.score
  FROM scores s
  JOIN users u ON u.id = s.user_id
  WHERE s.round_id = r.id AND s.score > 0
  ORDER BY s.score DESC, s.updated_at ASC, s.user_id ASC
  LIMIT 1
) w ON true
LEFT JOIN scores m ON m.round_id = r.id AND m.user_id = $2
CROSS JOIN LATERAL (
  SELECT COALESCE(
           json_agg(json_build_object('place', k.place, 'userId', k.user_id, 'login', u.login, 'score', k.score)
                    ORDER BY k.place),
           '[]'::json) AS list
  FROM (
    SELECT s.user_id, s.score,
           row_number() OVER (ORDER BY s.score DESC, s.updated_at ASC, s.user_id ASC)::int AS place
    FROM scores s
    WHERE s.round_id = r.id
  ) k
  JOIN users u ON u.id = k.user_id
  WHERE k.place <= $3::int OR k.user_id = $2
) p
WHERE r.id = $1
`;
