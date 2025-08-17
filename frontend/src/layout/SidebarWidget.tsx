import { useNavigate } from "react-router-dom";

export default function SidebarWidget() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:3002/api/logout", {
        method: "POST",
        credentials: "include", // important to clear the cookie
      });

      // Remove token from localStorage (if using Option 1 from earlier)
      localStorage.removeItem("token");

      // Redirect to sign-in
      navigate("/signin");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div
      className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]"
    >
      <button
        onClick={handleLogout}
        className="flex items-center justify-center p-3 font-medium text-white rounded-lg bg-red-500 text-theme-sm hover:bg-red-400 w-full"
      >
        Logout
      </button>
    </div>
  );
}
