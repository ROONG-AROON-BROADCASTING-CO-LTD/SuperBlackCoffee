export type AttendanceLocation = {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
};

const locationOptions: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
};

function locationErrorMessage(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'กรุณาอนุญาตให้แอปเข้าถึงตำแหน่งก่อนลงเวลา';
    case error.POSITION_UNAVAILABLE:
      return 'ยังไม่สามารถระบุตำแหน่งปัจจุบันได้ กรุณาลองใหม่';
    case error.TIMEOUT:
      return 'ใช้เวลาตรวจสอบตำแหน่งนานเกินไป กรุณาลองใหม่';
    default:
      return 'ไม่สามารถอ่านตำแหน่งปัจจุบันได้';
  }
}

export function requestAttendanceLocation(): Promise<AttendanceLocation> {
  if (!navigator.geolocation) {
    return Promise.reject(
      new Error('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่งสำหรับลงเวลา'),
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          reject(new Error('พิกัดปัจจุบันไม่ถูกต้อง กรุณาลองใหม่'));
          return;
        }
        resolve({
          latitude,
          longitude,
          accuracyM:
            Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
        });
      },
      (error) => reject(new Error(locationErrorMessage(error))),
      locationOptions,
    );
  });
}
