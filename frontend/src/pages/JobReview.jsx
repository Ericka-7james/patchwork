import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import Footer from "../components/Footer";
import LoadingOverlay from "../components/common/LoadingOverlay";
import JobApplicationCard from "../components/job-review/JobApplicationCard";
import { JOB_STATUS_OPTIONS } from "../components/job-review/jobStatusOptions";

import { connectGmail } from "../services/authService";

import {
  getGoogleProviderToken,
  getJobApplications,
  syncJobApplications,
  updateJobApplicationStatus,
} from "../services/jobReviewService";

import { useAuth } from "../context/useAuth";

import "./styles/JobReview.css";

const FILTERS = [
  {
    value: "all",
    label: "All",
  },
  ...JOB_STATUS_OPTIONS,
];

function JobReview() {
  const navigate = useNavigate();

  const { user, profile, signOut } = useAuth();

  const [applications, setApplications] = useState([]);

  const [activeFilter, setActiveFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);

  const [isSyncing, setIsSyncing] = useState(false);

  const [isConnecting, setIsConnecting] = useState(false);

  const [isGmailConnected, setIsGmailConnected] = useState(false);

  const [updatingJobId, setUpdatingJobId] = useState(null);

  const [error, setError] = useState("");

  const [syncMessage, setSyncMessage] = useState("");

  const [logoutError, setLogoutError] = useState("");

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const firstName = profile?.first_name;

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    let isActive = true;

    async function loadPage() {
      setIsLoading(true);
      setError("");
      setSyncMessage("");

      try {
        const [jobs, providerToken] = await Promise.all([
          getJobApplications(user.id),
          getGoogleProviderToken(),
        ]);

        if (!isActive) {
          return;
        }

        setApplications(jobs);

        setIsGmailConnected(Boolean(providerToken));
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(loadError.message || "Unable to load Job Review.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      isActive = false;
    };
  }, [user?.id]);

  const filteredApplications = useMemo(() => {
    if (activeFilter === "all") {
      return applications;
    }

    return applications.filter(
      (application) => application.status === activeFilter
    );
  }, [activeFilter, applications]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: applications.length,
    };

    for (const option of JOB_STATUS_OPTIONS) {
      counts[option.value] = applications.filter(
        (application) => application.status === option.value
      ).length;
    }

    return counts;
  }, [applications]);

  async function handleConnectGmail() {
    setError("");
    setSyncMessage("");
    setIsConnecting(true);

    try {
      await connectGmail();
    } catch (connectError) {
      setError(connectError.message || "Unable to connect Gmail.");

      setIsConnecting(false);
    }
  }

  async function handleSync() {
    setError("");
    setSyncMessage("");
    setIsSyncing(true);

    try {
      const result = await syncJobApplications();

      const jobs = await getJobApplications(user.id);

      setApplications(jobs);

      setIsGmailConnected(true);

      setSyncMessage(
        `Reviewed ${result.message_count} relevant email${
          result.message_count === 1 ? "" : "s"
        } and updated ${result.application_count} Job Review entr${
          result.application_count === 1 ? "y" : "ies"
        }.`
      );
    } catch (syncError) {
      setError(syncError.message || "Unable to sync Gmail.");

      if (syncError.message?.toLowerCase().includes("reconnect")) {
        setIsGmailConnected(false);
      }
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleStatusChange(jobId, status) {
    setError("");

    setUpdatingJobId(jobId);

    try {
      const updatedJob = await updateJobApplicationStatus({
        jobId,
        status,
      });

      setApplications((currentApplications) =>
        currentApplications.map((application) =>
          application.id === jobId ? updatedJob : application
        )
      );
    } catch (updateError) {
      setError(updateError.message || "Unable to update job status.");
    } finally {
      setUpdatingJobId(null);
    }
  }

  async function handleLogout() {
    setLogoutError("");
    setIsLoggingOut(true);

    try {
      await signOut();

      navigate("/login", {
        replace: true,
      });
    } catch (signOutError) {
      setLogoutError(signOutError.message || "Unable to log out.");

      setIsLoggingOut(false);
    }
  }

  return (
    <div className="site-shell job-review-shell">
      <LoadingOverlay
        isLoading={isSyncing}
        fullScreen
        message="Reviewing your job emails..."
      />

      <Header
        variant="app"
        firstName={firstName}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className="job-review-main">
        <section className="job-review-intro">
          <div>
            <p className="eyebrow">Job Review</p>

            <h1>See where your applications stand.</h1>

            <p>
              Connect Gmail to organize recent job application updates, then
              correct anything PatchWork gets wrong.
            </p>
          </div>

          <div className="job-review-intro-actions">
            {!isGmailConnected ? (
              <button
                type="button"
                className="button button-primary"
                onClick={handleConnectGmail}
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect Gmail"}
              </button>
            ) : (
              <>
                <span className="job-review-connected-label">
                  Gmail connected
                </span>

                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? "Syncing..." : "Sync Gmail"}
                </button>
              </>
            )}
          </div>
        </section>

        {error && (
          <div className="job-review-alert" role="alert">
            {error}
          </div>
        )}

        {syncMessage && (
          <div className="job-review-status" role="status">
            {syncMessage}
          </div>
        )}

        {isLoading ? (
          <div className="job-review-status" role="status">
            Loading Job Review...
          </div>
        ) : (
          <>
            <nav
              className="job-review-filters"
              aria-label="Job review status filters"
            >
              {FILTERS.map((filter) => (
                <button
                  type="button"
                  className={`job-review-filter ${
                    activeFilter === filter.value
                      ? "job-review-filter-active"
                      : ""
                  }`}
                  aria-pressed={activeFilter === filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  key={filter.value}
                >
                  <span>{filter.label}</span>

                  <strong>{statusCounts[filter.value] ?? 0}</strong>
                </button>
              ))}
            </nav>

            <section className="job-review-results">
              {filteredApplications.length > 0 ? (
                <div className="job-review-list">
                  {filteredApplications.map((application) => (
                    <JobApplicationCard
                      job={application}
                      isUpdating={updatingJobId === application.id}
                      onStatusChange={handleStatusChange}
                      key={application.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="job-review-empty">
                  <h2>
                    {applications.length === 0
                      ? "No applications yet."
                      : "Nothing in this category."}
                  </h2>

                  <p>
                    {applications.length === 0
                      ? "Connect Gmail and sync your recent job emails to start building Job Review."
                      : "Change the filter or move an application into this category using its status menu."}
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        {logoutError && (
          <div className="job-review-alert" role="alert">
            {logoutError}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default JobReview;
