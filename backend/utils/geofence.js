// Haversine formula to calculate distance between two lat/lng points in meters
export function normalizeLocation(latitude, longitude, accuracy) {
    if ([latitude, longitude, accuracy].some(value => value === undefined || value === null || value === "")) {
        return null;
    }

    const location = {
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy: Number(accuracy)
    };

    if (
        !Object.values(location).every(Number.isFinite) ||
        location.latitude < -90 || location.latitude > 90 ||
        location.longitude < -180 || location.longitude > 180 ||
        location.accuracy < 0 || location.accuracy > 20
    ) {
        return null;
    }

    return location;
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
    if ([lat1, lon1, lat2, lon2].some(v => v === undefined || v === null || Number.isNaN(v))) {
        return null;
    }

    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance; // meters
}

export default { calculateDistance };