import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestAttendanceLocation } from './attendanceLocation';

describe('requestAttendanceLocation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses a fresh high-accuracy browser position', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) =>
      success({
        coords: { latitude: 16.821085, longitude: 100.2694448, accuracy: 8 },
      } as GeolocationPosition),
    );
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    await expect(requestAttendanceLocation()).resolves.toEqual({
      latitude: 16.821085,
      longitude: 100.2694448,
      accuracyM: 8,
    });
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ enableHighAccuracy: true, maximumAge: 0 }),
    );
  });

  it('explains when location permission is denied', async () => {
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, fail: PositionErrorCallback) =>
        fail({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
    );
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    await expect(requestAttendanceLocation()).rejects.toThrow(
      'กรุณาอนุญาตให้แอปเข้าถึงตำแหน่งก่อนลงเวลา',
    );
  });
});
