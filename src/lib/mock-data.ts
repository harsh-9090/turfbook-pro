import { addDays, format } from "date-fns";

export type FacilityType = "cricket" | "snooker" | "pool";

export interface Facility {
  id: FacilityType;
  name: string;
  description: string;
  image: string;
  icon: string;
}

export interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  price: number;
}

export interface Booking {
  id: string;
  customerName: string;
  phone: string;
  date: string;
  facility: FacilityType;
  startTime: string;
  endTime: string;
  status: "confirmed" | "cancelled" | "pending";
  paymentStatus: "paid" | "pending" | "refunded";
  amount: number;
  createdAt: string;
}

const PRICING: Record<FacilityType, { weekday: number; weekend: number; peakSurcharge: number }> = {
  cricket: { weekday: 1200, weekend: 1800, peakSurcharge: 300 },
  snooker: { weekday: 400, weekend: 500, peakSurcharge: 100 },
  pool: { weekday: 300, weekend: 400, peakSurcharge: 100 },
};

export function generateSlots(date: Date, facility: FacilityType = "cricket"): Slot[] {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const pricing = PRICING[facility];
  const basePrice = isWeekend ? pricing.weekend : pricing.weekday;
  const slots: Slot[] = [];

  const startHour = facility === "cricket" ? 6 : 10;
  const endHour = facility === "cricket" ? 23 : 24;

  for (let hour = startHour; hour < endHour; hour++) {
    const startTime = `${hour.toString().padStart(2, "0")}:00`;
    const endTime = `${((hour + 1) % 24).toString().padStart(2, "0")}:00`;
    slots.push({
      id: `slot-${facility}-${format(date, "yyyy-MM-dd")}-${hour}`,
      startTime,
      endTime,
      isAvailable: Math.random() > 0.3,
      price: hour >= 18 ? basePrice + pricing.peakSurcharge : basePrice,
    });
  }
  return slots;
}

export const facilityLabels: Record<FacilityType, string> = {
  cricket: "Cricket Turf",
  snooker: "Snooker Table",
  pool: "Pool Table",
};

export const mockBookings: Booking[] = [
  { id: "BK001", customerName: "Rahul Sharma", phone: "+91 98765 43210", date: format(new Date(), "yyyy-MM-dd"), facility: "cricket", startTime: "18:00", endTime: "19:00", status: "confirmed", paymentStatus: "paid", amount: 1500, createdAt: format(addDays(new Date(), -2), "yyyy-MM-dd") },
  { id: "BK002", customerName: "Priya Patel", phone: "+91 87654 32109", date: format(new Date(), "yyyy-MM-dd"), facility: "snooker", startTime: "19:00", endTime: "20:00", status: "confirmed", paymentStatus: "paid", amount: 500, createdAt: format(addDays(new Date(), -1), "yyyy-MM-dd") },
  { id: "BK003", customerName: "Amit Kumar", phone: "+91 76543 21098", date: format(addDays(new Date(), 1), "yyyy-MM-dd"), facility: "cricket", startTime: "17:00", endTime: "18:00", status: "pending", paymentStatus: "pending", amount: 1200, createdAt: format(new Date(), "yyyy-MM-dd") },
  { id: "BK004", customerName: "Sneha Reddy", phone: "+91 65432 10987", date: format(addDays(new Date(), 1), "yyyy-MM-dd"), facility: "pool", startTime: "20:00", endTime: "21:00", status: "confirmed", paymentStatus: "paid", amount: 400, createdAt: format(new Date(), "yyyy-MM-dd") },
  { id: "BK005", customerName: "Vikram Singh", phone: "+91 54321 09876", date: format(addDays(new Date(), -1), "yyyy-MM-dd"), facility: "snooker", startTime: "16:00", endTime: "17:00", status: "cancelled", paymentStatus: "refunded", amount: 400, createdAt: format(addDays(new Date(), -3), "yyyy-MM-dd") },
  { id: "BK006", customerName: "Ananya Desai", phone: "+91 43210 98765", date: format(addDays(new Date(), 2), "yyyy-MM-dd"), facility: "cricket", startTime: "09:00", endTime: "10:00", status: "confirmed", paymentStatus: "paid", amount: 1200, createdAt: format(new Date(), "yyyy-MM-dd") },
];

export const stats = {
  totalBookings: 284,
  todayBookings: 14,
  dailyRevenue: 18600,
  monthlyRevenue: 412000,
  upcomingBookings: 38,
  cancelledBookings: 7,
};

export const revenueData = [
  { name: "Mon", cricket: 12400, snooker: 3200, pool: 2400 },
  { name: "Tue", cricket: 9800, snooker: 2800, pool: 1800 },
  { name: "Wed", cricket: 11200, snooker: 3400, pool: 2200 },
  { name: "Thu", cricket: 13600, snooker: 3000, pool: 2600 },
  { name: "Fri", cricket: 18200, snooker: 4800, pool: 3600 },
  { name: "Sat", cricket: 24400, snooker: 5600, pool: 4200 },
  { name: "Sun", cricket: 21800, snooker: 5200, pool: 3800 },
];

export const peakHoursData = [
  { hour: "6AM", bookings: 3 },
  { hour: "8AM", bookings: 5 },
  { hour: "10AM", bookings: 6 },
  { hour: "12PM", bookings: 4 },
  { hour: "2PM", bookings: 5 },
  { hour: "4PM", bookings: 8 },
  { hour: "5PM", bookings: 11 },
  { hour: "6PM", bookings: 16 },
  { hour: "7PM", bookings: 19 },
  { hour: "8PM", bookings: 15 },
  { hour: "9PM", bookings: 12 },
  { hour: "10PM", bookings: 7 },
];
