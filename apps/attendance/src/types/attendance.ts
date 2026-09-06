export type StaffPage = 'overview' | 'attendance' | 'leave' | 'history';

export type LeaveType = 'ลาป่วย' | 'ลากิจ' | 'ลาอื่นๆ';

export type WorkHistoryItem = readonly [
  date: string,
  checkIn: string,
  checkOut: string,
  total: string,
];
