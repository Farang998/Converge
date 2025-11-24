import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./analytics.css";
import "./charts.css";
import "../../components/accordion.css"; 
import AccordionSection from "../../components/AccordionSection";
import TaskWorkflowManagement from "./TaskWorkflowManagement";
import TeamActivityDashboard from "./TeamActivityDashboard";
import FileActivityDashboard from "./FileActivityDashboard"; 
// charts ( existing chart components)
import TaskStatusChart from "./Charts/TaskStatusChart";
import WorkloadChart from "./Charts/WorkloadChart";
import PriorityByDependenciesChart from "./Charts/PriorityByDependenciesChart";
import PriorityByDueDateChart from "./Charts/PriorityByDueDateChart";

/*
  Updated analytics page:
  - First accordion: Project Overview (collapsed by default)
  - Additional accordions: Task Status & Workflow Dashboard, Team Activity Dashboard, File Storage & File Activity Dashboard
*/

export default function ProjectAnalytics() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`projects/dashboard/${projectId}/overview/`);
        setOverview(data);
      } catch (err) {
        console.error("Failed to load analytics overview:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  // Project Overview content extracted to a function to keep JSX tidy
  const ProjectOverviewContent = () => {
    if (loading) return <p>Loading analytics...</p>;
    if (!overview) return <p>No analytics available.</p>;

    return (
      <div className="analytics-grid">
        {/* ROW 1 */}
        <div
          className="charts-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            width: "100%",
          }}
        >
          <div className="chart-card">
            <div className="chart-title">Task Status</div>
            <TaskStatusChart data={overview.task_status_counts} />
          </div>

          <div className="chart-card">
            <div className="chart-title">Workload</div>
            {/* WorkloadChart expects data as [{name, value}] per your backend */}
            <WorkloadChart data={overview.tasks_per_member} />
          </div>
        </div>

        {/* ROW 2 */}
        <div
          className="charts-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginTop: 20,
            width: "100%",
          }}
        >
          <div className="chart-card">
            <div className="chart-title">Task Priority By Dependencies</div>
            <PriorityByDependenciesChart data={overview.priority_by_dependencies} />
          </div>

          <div className="chart-card">
            <div className="chart-title">Task Priority By Due Date</div>
            <PriorityByDueDateChart data={overview.priority_by_due_date} />
          </div>
        </div>

        {/* ROW 3 - upcoming deadlines full width */}
        <div
          className="chart-card"
          style={{
            width: "100%",
            marginTop: 24,
          }}
        >
          <div className="chart-title">Upcoming Deadlines</div>

          {overview.upcoming_deadlines?.length ? (
            <table className="upcoming-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {overview.upcoming_deadlines.map((t) => (
                  <tr key={t.id}>
                    <td style={{ maxWidth: "60%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.name}
                    </td>
                    <td>{t.due ? new Date(t.due).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No upcoming deadlines.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="analytics-page">
      {/* HEADER */}
      <div className="analytics-header">
        <h2 className="analytics-title">📊 Project Analytics</h2>

        <div className="analytics-actions">
          <button onClick={() => navigate(-1)}>← Back</button>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      </div>

      {/* Accordion sections */}
      <AccordionSection title="Project Overview" defaultOpen={false}>
        <ProjectOverviewContent />
      </AccordionSection>

      <AccordionSection title="Task Workflow Dashboard" defaultOpen={false}>
        <TaskWorkflowManagement projectId={projectId} />
      </AccordionSection>

      <AccordionSection title="Team Activity Dashboard" defaultOpen={false}>
       <TeamActivityDashboard projectId={projectId} />
      </AccordionSection>

      <AccordionSection title="File Storage & File Activity Dashboard" defaultOpen={false}>
        <FileActivityDashboard projectId={projectId} />
      </AccordionSection>
    </div>
  );
}
