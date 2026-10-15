import { EventEmitter } from "events";

class AttendanceEvents extends EventEmitter {}

// Global singleton
export const attendanceEvents = global.attendanceEvents || new AttendanceEvents();

if (process.env.NODE_ENV !== "production") {
  global.attendanceEvents = attendanceEvents;
}

declare global {
  var attendanceEvents: AttendanceEvents | undefined;
}
