import { addDays, format } from "date-fns";

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
  startTime: string;
  endTime: string;
  status: "confirmed" | "cancelled" | "pending";
  paymentStatus: "paid" | "pending" | "refunded";
  amount: number;
  createdAt: string;
}

const WEEKDAY_PRICE = 800;
const WEEKEND_PRICE = 1200;

export function generateSlots(date: Date): Slot[] {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const price = isWeekend ? WEEKEND_PRICE : WEEKDAY_PRICE;
  const slots: Slot[] = [];
  
  for (let hour = 6; hour < 23; hour++) {
    const startTime = `${hour.toString().padStart(2, "0")}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;
    slots.push({
      id: `slot-${format(date, "yyyy-MM-dd")}-${hour}`,
      startTime,
      endTime,
      isAvailable: Math.random() > 0.3,
      price: hour >= 18 ? price + 200 : price,
    });
  }
  return slots;
}

export const mockBookings: Booking[] = [
  { id: "BK001", customerName: "Rahul Sharma", phone: "+91 98765 43210", date: format(new Date(), "yyyy-MM-dd"), startTime: "18:00", endTime: "19:00", status: "confirmed", paymentStatus: "paid", amount: 1000, createdAt: format(addDays(new Date(), -2), "yyyy-MM-dd") },
  { id: "BK002", customerName: "Priya Patel", phone: "+91 87654 32109", date: format(new Date(), "yyyy-MM-dd"), startTime: "19:00", endTime: "20:00", status: "confirmed", paymentStatus: "paid", amount: 1000, createdAt: format(addDays(new Date(), -1), "yyyy-MM-dd") },
  { id: "BK003", customerName: "Amit Kumar", phone: "+91 76543 21098", date: format(addDays(new Date(), 1), "yyyy-MM-dd"), startTime: "17:00", endTime: "18:00", status: "pending", paymentStatus: "pending", amount: 800, createdAt: format(new Date(), "yyyy-MM-dd") },
  { id: "BK004", customerName: "Sneha Reddy", phone: "+91 65432 10987", date: format(addDays(new Date(), 1), "yyyy-MM-dd"), startTime: "20:00", endTime: "21:00", status: "confirmed", paymentStatus: "paid", amount: 1200, createdAt: format(new Date(), "yyyy-MM-dd") },
  { id: "BK005", customerName: "Vikram Singh", phone: "+91 54321 09876", date: format(addDays(new Date(), -1), "yyyy-MM-dd"), startTime: "16:00", endTime: "17:00", status: "cancelled", paymentStatus: "refunded", amount: 800, createdAt: format(addDays(new Date(), -3), "yyyy-MM-dd") },
  { id: "BK006", customerName: "Ananya Desai", phone: "+91 43210 98765", date: format(addDays(new Date(), 2), "yyyy-MM-dd"), startTime: "09:00", endTime: "10:00", status: "confirmed", paymentStatus: "paid", amount: 800, createdAt: format(new Date(), "yyyy-MM-dd") },
];

export const stats = {
  totalBookings: 156,
  todayBookings: 8,
  dailyRevenue: 12400,
  monthlyRevenue: 245000,
  upcomingBookings: 23,
  cancelledBookings: 5,
};

export const revenueData = [
  { name: "Mon", revenue: 8400 },
  { name: "Tue", revenue: 6800 },
  { name: "Wed", revenue: 7200 },
  { name: "Thu", revenue: 9600 },
  { name: "Fri", revenue: 14200 },
  { name: "Sat", revenue: 18400 },
  { name: "Sun", revenue: 16800 },
];

export const peakHoursData = [
  { hour: "6AM", bookings: 2 },
  { hour: "7AM", bookings: 3 },
  { hour: "8AM", bookings: 4 },
  { hour: "9AM", bookings: 5 },
  { hour: "10AM", bookings: 3 },
  { hour: "11AM", bookings: 2 },
  { hour: "12PM", bookings: 1 },
  { hour: "1PM", bookings: 1 },
  { hour: "2PM", bookings: 2 },
  { hour: "3PM", bookings: 3 },
  { hour: "4PM", bookings: 6 },
  { hour: "5PM", bookings: 8 },
  { hour: "6PM", bookings: 12 },
  { hour: "7PM", bookings: 14 },
  { hour: "8PM", bookings: 11 },
  { hour: "9PM", bookings: 8 },
  { hour: "10PM", bookings: 5 },
];
