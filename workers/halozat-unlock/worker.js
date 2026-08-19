export default {
  async fetch(request, env) {
    const jsonResponse = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    try {
      if (request.method !== "POST") {
        return new Response(null, { status: 405, headers: { Allow: "POST" } });
      }

      let body;
      try {
        body = await request.json();
      } catch (e) {
        return jsonResponse({ status: "BAD_REQUEST", reason: "INVALID_JSON" }, 400);
      }

      const { drop_id, user_lat, user_lng } = body || {};

      if (
        typeof drop_id === "undefined" ||
        typeof user_lat === "undefined" ||
        typeof user_lng === "undefined" ||
        Number.isNaN(Number(user_lat)) ||
        Number.isNaN(Number(user_lng))
      ) {
        return jsonResponse({ status: "BAD_REQUEST", reason: "MALFORMED_PAYLOAD" }, 400);
      }

      // Extract Cloudflare network geolocation info
      const cf = request.cf || {};
      const cfCountry = typeof cf.country === "string" ? cf.country.toUpperCase() : undefined;
      const cfCity = typeof cf.city === "string" ? cf.city : undefined;

      // If IP geolocation is clearly outside Hungary, reject early
      if (cfCountry && cfCountry !== "HU") {
        return jsonResponse({ status: "SIGNAL_LOST", reason: "LOCATION_MISMATCH" }, 403);
      }

      // Build Supabase REST URL
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        return jsonResponse({ status: "SERVER_ERROR", reason: "MISSING_SUPABASE_CONFIG" }, 500);
      }

      // Supabase expects string values to be quoted; detect numeric-ish ids
      const isNumericId = typeof drop_id === "number" || /^[0-9]+$/.test(String(drop_id));
      const idQuery = isNumericId ? `id=eq.${encodeURIComponent(String(drop_id))}` : `id=eq.${encodeURIComponent("'" + String(drop_id) + "'")}`;

      const supaUrl = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/drops?${idQuery}&select=latitude,longitude,secret_payload`;

      const supaRes = await fetch(supaUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });

      if (!supaRes.ok) {
        return jsonResponse({ status: "SERVER_ERROR", reason: "SUPABASE_FETCH_FAILED" }, 502);
      }

      const drops = await supaRes.json();
      if (!Array.isArray(drops) || drops.length === 0) {
        return jsonResponse({ status: "NOT_FOUND" }, 404);
      }

      const drop = drops[0];
      const dbLat = Number(drop.latitude);
      const dbLng = Number(drop.longitude);

      if (Number.isNaN(dbLat) || Number.isNaN(dbLng)) {
        return jsonResponse({ status: "SERVER_ERROR", reason: "INVALID_DROP_COORDINATES" }, 500);
      }

      // Haversine formula (returns meters)
      function haversine(lat1, lon1, lat2, lon2) {
        const toRad = (deg) => (deg * Math.PI) / 180;
        const R = 6371000; // Earth radius in meters
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      }

      const userLatNum = Number(user_lat);
      const userLngNum = Number(user_lng);
      const distanceMeters = haversine(userLatNum, userLngNum, dbLat, dbLng);
      const rounded = Math.round(distanceMeters * 10) / 10; // one decimal

      // Optional: additional sanity check based on city if available (conservative)
      if (cfCity && !/budapest/i.test(cfCity)) {
        // If CF city is present and not Budapest, and the drop is in Budapest area, we can still continue; keep conservative: require country HU only
        // For now we do not block on city mismatch alone.
      }

      if (rounded <= 30) {
        return jsonResponse({ status: "UNLOCKED", payload: drop.secret_payload, distance: rounded }, 200);
      }

      return jsonResponse({ status: "SIGNAL_LOST", distance: rounded }, 403);
    } catch (err) {
      return new Response(JSON.stringify({ status: "SERVER_ERROR", reason: "UNEXPECTED_ERROR" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
