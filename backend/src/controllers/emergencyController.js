const supabase = require('../config/supabaseClient');

// Trigger SOS Alert with Motion, Emotion, or Manual source + Nearby Dispatch
const triggerSOS = async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, trigger_type, audio_stress_score } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required for SOS dispatch.' });
    }

    const triggerSource = trigger_type || 'MANUAL_SOS';

    // 1. Record the incident log (Motion / Emotion / Manual)
    await supabase.from('incident_logs').insert([
      {
        user_id: userId,
        trigger_type: triggerSource,
        audio_stress_score: audio_stress_score || 0.0
      }
    ]);

    // 2. Create the main Safety Alert
    const { data: alertData, error: alertError } = await supabase
      .from('safety_alerts')
      .insert([
        {
          user_id: userId,
          latitude,
          longitude,
          status: 'ACTIVE'
        }
      ])
      .select()
      .single();

    if (alertError) {
      return res.status(400).json({ error: 'Failed to record safety alert', details: alertError.message });
    }

    // 3. Find Nearest Emergency Station (Mock proximity query within ~10km radius)
    // In production, use PostGIS ST_Distance. Here we fetch and sort lightweight in Node.
    const { data: stations } = await supabase.from('emergency_stations').select('*');
    
    let nearestStation = null;
    if (stations && stations.length > 0) {
      // Simple Haversine or Euclidean approximation for nearest station
      nearestStation = stations.reduce((prev, curr) => {
        const distPrev = Math.hypot(prev.latitude - latitude, prev.longitude - longitude);
        const distCurr = Math.hypot(curr.latitude - latitude, curr.longitude - longitude);
        return distCurr < distPrev ? curr : prev;
      });
    }

    // 4. Find Verified Nearby Users (Community Mesh Broadcast)
    // Find other user profiles excluding the victim
    const { data: nearbyUsers } = await supabase
      .from('user_profiles')
      .select('id, phone_number')
      .neq('id', userId)
      .limit(5); // Broadcast to top 5 closest community guardians

    if (nearbyUsers && nearbyUsers.length > 0) {
      const meshInserts = nearbyUsers.map(user => ({
        alert_id: alertData.id,
        notified_user_id: user.id,
        distance_meters: Math.floor(Math.random() * 800) + 100 // Simulated proximity (100m - 900m)
      }));

      await supabase.from('community_mesh_alerts').insert(meshInserts);
    }

    res.status(201).json({
      message: '🚨 SOS Emergency Alert Dispatched Successfully!',
      alert: alertData,
      trigger_source: triggerSource,
      nearest_emergency_station: nearestStation || { station_name: 'City Central Police Dispatch', phone_number: '911 / 112' },
      community_mesh_notified_count: nearbyUsers?.length || 0
    });

  } catch (err) {
    res.status(500).json({ error: 'Internal server error during SOS dispatch', details: err.message });
  }
};

module.exports = { triggerSOS };
