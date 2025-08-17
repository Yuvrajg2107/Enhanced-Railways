import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import BForm from "./pages/BForm";
import Summary from "./pages/Summary";
import Charts from "./pages/Charts";
import { ProtectedRoute } from "./components/ProtectedItem";
export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index path="/" element={<Home />} />

          <Route path="/profile" element={<UserProfiles />} />
          <Route path="/blank" element={<Blank />} />
          <Route path="/b-form" element={<BForm />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/charts" element={<Charts />} />

        </Route>

        <Route path="/signin" element={<SignIn />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
