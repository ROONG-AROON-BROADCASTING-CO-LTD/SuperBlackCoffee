import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestAttendanceLocation } from './attendanceLocation';

const originalGeolocation = Object.getOwnPropertyDescriptor(
  navigator,
  'geolocation',
);

describe('requestAttendanceLocation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalGeolocation) {
      Object.defineProperty(navigator, 'geolocation', originalGeolocation);
    } else {
      Reflect.deleteProperty(navigator, 'geolocation');
    }
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

  it('rejects clearly when the device has no geolocation support', async () => {
    Reflect.deleteProperty(navigator, 'geolocation');
    await expect(requestAttendanceLocation()).rejects.toThrow(
      'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่งสำหรับลงเวลา',
    );
  });

  it.each([
    [2, 'ยังไม่สามารถระบุตำแหน่งปัจจุบันได้'],
    [3, 'ใช้เวลาตรวจสอบตำแหน่งนานเกินไป'],
  ])('reports browser location error code %i', async (code, message) => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (
          _success: PositionCallback,
          fail: PositionErrorCallback,
        ) =>
          fail({
            code,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError),
      },
    });
    await expect(requestAttendanceLocation()).rejects.toThrow(message);
  });

  it.each([
    { latitude: -90, longitude: -180, accuracy: 0 },
    { latitude: 90, longitude: 180, accuracy: 0 },
  ])(
    'accepts valid coordinate boundaries including zero accuracy',
    async (coords) => {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (success: PositionCallback) =>
            success({ coords } as GeolocationPosition),
        },
      });
      await expect(requestAttendanceLocation()).resolves.toEqual({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyM: 0,
      });
    },
  );

  it.each([
    { latitude: 91, longitude: 100, accuracy: 5 },
    { latitude: 13, longitude: -181, accuracy: 5 },
    { latitude: Number.NaN, longitude: 100, accuracy: 5 },
  ])(
    'rejects invalid browser coordinates instead of sending them to attendance',
    async (coords) => {
      const getCurrentPosition = vi.fn((success: PositionCallback) =>
        success({ coords } as GeolocationPosition),
      );
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: { getCurrentPosition },
      });

      await expect(requestAttendanceLocation()).rejects.toThrow(
        'พิกัดปัจจุบันไม่ถูกต้อง',
      );
    },
  );

  it('omits an invalid accuracy value while retaining valid coordinates', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) =>
      success({
        coords: { latitude: 13, longitude: 100, accuracy: -1 },
      } as GeolocationPosition),
    );
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    await expect(requestAttendanceLocation()).resolves.toEqual({
      latitude: 13,
      longitude: 100,
      accuracyM: null,
    });
  });
});
