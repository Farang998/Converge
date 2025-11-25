// src/pages/Dashboard/FileActivityDashboard.jsx
import React, { useEffect, useState } from "react";
import api from "../../services/api";
import StoragePerFileChart from "./Charts/StoragePerFileChart";
import TopUploadersChart from "./Charts/TopUploadersChart";
import FileTypesPieChart from "./Charts/FileTypesPieChart";
import "./analytics.css";

export default function FileActivityDashboard({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await api.get(`projects/dashboard/${projectId}/file-analytics/`);
        if (!mounted) return;
        setData(resp.data);
      } catch (err) {
        console.error("Failed to load file analytics", err);
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [projectId]);

  if (loading) return <div className="chart-card"><div className="chart-title">Loading file analytics...</div></div>;
  if (!data) return <div className="chart-card"><div className="chart-title">No file activity data</div></div>;

  return (
    <div className="analytics-grid" style={{ gap: 18 }}>
      {/* Row 1: Storage per file (full width) */}
      <div className="chart-card" style={{ width: "100%" }}>
        <div className="chart-title">Storage Usage (per file)</div>
        <StoragePerFileChart data={data.storage_per_file} />
      </div>

      {/* Row 2: Two charts side-by-side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="chart-card">
          <div className="chart-title">Most Active Uploaders</div>
          <TopUploadersChart data={data.top_uploaders} />
        </div>

        <div className="chart-card">
          <div className="chart-title">Uploaded File Types</div>
          <FileTypesPieChart data={data.file_types} />
        </div>
      </div>
    </div>
  );
}
