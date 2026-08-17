import { JOB_STATUS_OPTIONS } from "./jobStatusOptions";
import "./styles/JobApplicationCard.css";

function formatJobDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function JobApplicationCard({ job, onStatusChange, isUpdating = false }) {
  if (!job) {
    return null;
  }

  const displayDate = formatJobDate(job.last_email_at ?? job.applied_at);

  async function handleStatusChange(event) {
    await onStatusChange(job.id, event.target.value);
  }

  return (
    <article className="job-application-card">
      <div className="job-application-card-copy">
        <span className="job-application-company">
          {job.company || "Company needs review"}
        </span>

        <h2>{job.role || "Role needs review"}</h2>

        {displayDate && (
          <p className="job-application-date">Last update {displayDate}</p>
        )}
      </div>

      <div className="job-application-card-actions">
        <label className="job-application-status-field">
          <span className="sr-only">Status for {job.role}</span>

          <select
            value={job.status}
            onChange={handleStatusChange}
            disabled={isUpdating}
            aria-label={`Status for ${job.role}`}
          >
            {JOB_STATUS_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {job.status_source === "manual" && (
          <small className="job-application-manual-label">
            Manually updated
          </small>
        )}
      </div>
    </article>
  );
}

export default JobApplicationCard;
