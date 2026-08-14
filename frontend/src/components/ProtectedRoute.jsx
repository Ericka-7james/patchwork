import { Navigate, Outlet } from "react-router-dom";
import { COMPONENT_CONTENT } from "../common/componentContent";
import { useAuth } from "../context/useAuth";

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const { loadingMessage, loginRoute } = COMPONENT_CONTENT.protectedRoute;

  if (isLoading) {
    return (
      <main>
        <p>{loadingMessage}</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to={loginRoute} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
