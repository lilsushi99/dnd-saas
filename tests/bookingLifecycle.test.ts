import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBookingLifecycle,
  parseBookingStartTime,
  bookingOccupiesOn,
} from '../server/domain/businessRules';

test('parseBookingStartTime: handles multiple formats correctly', () => {
  assert.equal(parseBookingStartTime('09:00:00'), '09:00:00');
  assert.equal(parseBookingStartTime('14:30'), '14:30:00');
  assert.equal(parseBookingStartTime('09:00 AM - 05:00 PM'), '09:00:00');
  assert.equal(parseBookingStartTime('02:15 PM - 06:00 PM'), '14:15:00');
  assert.equal(parseBookingStartTime(null, '08:00:00'), '08:00:00');
});

test('calculateBookingLifecycle: 1-day booking does NOT expire before 24 hours have elapsed', () => {
  // Start: 2026-10-15 09:00:00 WAT (UTC+01:00) => 2026-10-15T08:00:00.000Z
  const startTimeMs = new Date('2026-10-15T09:00:00+01:00').getTime();

  // 1 hour after start
  const activeCheckMs = startTimeMs + 1 * 3600 * 1000;
  const resultActive = calculateBookingLifecycle(
    {
      date: '2026-10-15',
      startTime: '09:00:00',
      daysCount: 1,
      durationUnit: 'Day',
    },
    activeCheckMs
  );
  assert.equal(resultActive.status, 'Active', '1-day booking must be Active 1 hour after start');
  assert.equal(resultActive.daysLeft, 1, '1-day booking must have daysLeft >= 1 while active');

  // 23 hours after start (still within 24 hours)
  const stillActiveMs = startTimeMs + 23 * 3600 * 1000;
  const resultStillActive = calculateBookingLifecycle(
    {
      date: '2026-10-15',
      startTime: '09:00:00',
      daysCount: 1,
      durationUnit: 'Day',
    },
    stillActiveMs
  );
  assert.equal(resultStillActive.status, 'Active', '1-day booking must remain Active at 23 hours');

  // Exactly 24 hours + 1 second after start => Expired
  const expiredMs = startTimeMs + 24 * 3600 * 1000 + 1000;
  const resultExpired = calculateBookingLifecycle(
    {
      date: '2026-10-15',
      startTime: '09:00:00',
      daysCount: 1,
      durationUnit: 'Day',
    },
    expiredMs
  );
  assert.equal(resultExpired.status, 'Expired', '1-day booking expires only after full 24 hours');
  assert.equal(resultExpired.daysLeft, 0);
});

test('calculateBookingLifecycle: 5-day booking follows Active -> Expiring Soon (final 72h) -> Expired', () => {
  // Start: 2026-10-10 09:00:00 WAT (120 hours total duration)
  const startTimeMs = new Date('2026-10-10T09:00:00+01:00').getTime();

  // Day 1 (24h into booking, 96h remaining > 72h) -> Active
  const day1Ms = startTimeMs + 24 * 3600 * 1000;
  const resDay1 = calculateBookingLifecycle(
    {
      date: '2026-10-10',
      startTime: '09:00:00',
      daysCount: 5,
      durationUnit: 'Day',
    },
    day1Ms
  );
  assert.equal(resDay1.status, 'Active', 'Must be Active when more than 72 hours remain');

  // Day 3 (50h into booking, 70h remaining <= 72h) -> Expiring Soon
  const day3Ms = startTimeMs + 50 * 3600 * 1000;
  const resDay3 = calculateBookingLifecycle(
    {
      date: '2026-10-10',
      startTime: '09:00:00',
      daysCount: 5,
      durationUnit: 'Day',
    },
    day3Ms
  );
  assert.equal(resDay3.status, 'Expiring Soon', 'Must show Expiring Soon in final 72 hours');

  // After 120 hours (5 full days elapsed) -> Expired
  const after120hMs = startTimeMs + 120 * 3600 * 1000 + 1000;
  const resExpired = calculateBookingLifecycle(
    {
      date: '2026-10-10',
      startTime: '09:00:00',
      daysCount: 5,
      durationUnit: 'Day',
    },
    after120hMs
  );
  assert.equal(resExpired.status, 'Expired', 'Must expire after full 120 hours elapsed');
});

test('calculateBookingLifecycle: hourly booking lifecycle', () => {
  // Start: 2026-10-15 10:00:00 WAT, 3 hours duration (expires at 13:00:00)
  const startTimeMs = new Date('2026-10-15T10:00:00+01:00').getTime();

  // Before start time -> Upcoming
  const beforeStart = startTimeMs - 10 * 60 * 1000;
  const resUpcoming = calculateBookingLifecycle(
    {
      date: '2026-10-15',
      startTime: '10:00:00',
      durationCount: 3,
      durationUnit: 'Hour',
    },
    beforeStart
  );
  assert.equal(resUpcoming.status, 'Upcoming');

  // During 3-hour period (e.g. 1.5 hours in) -> Active
  const duringActive = startTimeMs + 90 * 60 * 1000;
  const resActive = calculateBookingLifecycle(
    {
      date: '2026-10-15',
      startTime: '10:00:00',
      durationCount: 3,
      durationUnit: 'Hour',
    },
    duringActive
  );
  assert.equal(resActive.status, 'Active');

  // After 3 hours have elapsed -> Expired
  const afterDuration = startTimeMs + 3 * 3600 * 1000 + 1000;
  const resExpired = calculateBookingLifecycle(
    {
      date: '2026-10-15',
      startTime: '10:00:00',
      durationCount: 3,
      durationUnit: 'Hour',
    },
    afterDuration
  );
  assert.equal(resExpired.status, 'Expired');
});

test('bookingOccupiesOn: hourly booking occupies only on its booking date', () => {
  const hourlyBooking = {
    date: '2026-10-15',
    daysCount: 1,
    durationUnit: 'Hour' as const,
    status: 'Active',
  };

  assert.equal(bookingOccupiesOn(hourlyBooking, '2026-10-15'), true, 'Occupies on booking date');
  assert.equal(bookingOccupiesOn(hourlyBooking, '2026-10-16'), false, 'Does NOT occupy next day');

  const dailyBooking = {
    date: '2026-10-15',
    daysCount: 3,
    durationUnit: 'Day' as const,
    status: 'Active',
  };
  assert.equal(bookingOccupiesOn(dailyBooking, '2026-10-15'), true);
  assert.equal(bookingOccupiesOn(dailyBooking, '2026-10-16'), true);
  assert.equal(bookingOccupiesOn(dailyBooking, '2026-10-17'), true);
  assert.equal(bookingOccupiesOn(dailyBooking, '2026-10-18'), false);
});
