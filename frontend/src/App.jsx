import { useEffect, useState } from "react";

// TEMP
import { supabase } from "./lib/supabase";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/health`)
      .then((response) => response.json())
      .then((data) => {
        setBackendStatus(data.status);
      })
      .catch(() => {
        setBackendStatus("Backend unavailable");
      });

    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        console.error("Supabase connection error:", error);
      } else {
        console.log("Supabase connected");
      }
    });
  }, []);

  return (
    <main>
      <h1>PatchWork</h1>
      <p>Backend status: {backendStatus}</p>
    </main>
  );
}

export default App;