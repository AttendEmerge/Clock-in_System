const pool = require('../db/pool');

/**
 * Haversine formula — returns distance in metres between two lat/lng points.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in metres
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a given lat/lng is within any active acceptable location.
 * @param {number} accuracy – GPS accuracy in metres reported by the device (optional).
 *   Capped at 150 m to prevent abuse from very poor GPS while tolerating
 *   typical inaccuracy (10-50 m).
 * Returns { acceptable: bool, matchedLocation: row|null }
 */
async function isLocationAcceptable(latitude, longitude, accuracy) {
  const MAX_TOLERANCE = 150;
  const tolerance = accuracy ? Math.min(accuracy, MAX_TOLERANCE) : 0;

  const [locations] = await pool.query(
    'SELECT * FROM acceptable_locations WHERE is_active = 1'
  );
  for (const loc of locations) {
    const dist = haversineDistance(latitude, longitude, loc.latitude, loc.longitude);
    if (dist <= loc.radius_meters + tolerance) {
      return { acceptable: true, matchedLocation: loc };
    }
  }
  return { acceptable: false, matchedLocation: null };
}

module.exports = { haversineDistance, isLocationAcceptable };
