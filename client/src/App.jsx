import { Route, Routes } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import ClubDetail from "./pages/admin/ClubDetail";
import Clubs from "./pages/admin/Clubs";
import Fees from "./pages/admin/Fees";
import Leave from "./pages/admin/Leave";
import Library from "./pages/admin/Library";
import Notices from "./pages/admin/Notices";
import Sba from "./pages/admin/Sba";
import Students from "./pages/admin/Students";
import Timetable from "./pages/admin/Timetable";
import Transport from "./pages/admin/Transport";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Child from "./pages/parent/Child";
import ParentDashboard from "./pages/parent/Dashboard";
import Trip from "./pages/driver/Trip";
import Calendar from "./pages/shared/Calendar";
import PickupCheck from "./pages/shared/PickupCheck";
import Reports from "./pages/shared/Reports";
import Assessments from "./pages/teacher/Assessments";
import Attendance from "./pages/teacher/Attendance";
import TeacherDashboard from "./pages/teacher/Dashboard";
import Diary from "./pages/teacher/Diary";
import Homework from "./pages/teacher/Homework";
import Portfolio from "./pages/teacher/Portfolio";
import TeacherTimetable from "./pages/teacher/Timetable";
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="notices" element={<Notices />} />
          <Route path="clubs" element={<Clubs />} />
          <Route path="clubs/:id" element={<ClubDetail />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="reports" element={<Reports />} />
          <Route path="sba" element={<Sba />} />
          <Route path="fees" element={<Fees />} />
          <Route path="leave" element={<Leave />} />
          <Route path="pickup" element={<PickupCheck />} />
          <Route path="library" element={<Library />} />
          <Route path="transport" element={<Transport />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["teacher"]} />}>
        <Route path="/teacher" element={<DashboardLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="homework" element={<Homework />} />
          <Route path="assessments" element={<Assessments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="diary" element={<Diary />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="pickup" element={<PickupCheck />} />
          <Route path="timetable" element={<TeacherTimetable />} />
          <Route path="clubs" element={<Clubs />} />
          <Route path="clubs/:id" element={<ClubDetail />} />
          <Route path="notices" element={<Notices />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["parent"]} />}>
        <Route path="/parent" element={<DashboardLayout />}>
          <Route index element={<ParentDashboard />} />
          <Route path="children/:id" element={<Child />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["driver"]} />}>
        <Route path="/driver" element={<DashboardLayout />}>
          <Route index element={<Trip />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
