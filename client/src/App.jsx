import { Route, Routes } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import Clubs from "./pages/admin/Clubs";
import Notices from "./pages/admin/Notices";
import Students from "./pages/admin/Students";
import Transport from "./pages/admin/Transport";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Child from "./pages/parent/Child";
import ParentDashboard from "./pages/parent/Dashboard";
import Calendar from "./pages/shared/Calendar";
import Assessments from "./pages/teacher/Assessments";
import Attendance from "./pages/teacher/Attendance";
import TeacherDashboard from "./pages/teacher/Dashboard";
import Homework from "./pages/teacher/Homework";
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

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
