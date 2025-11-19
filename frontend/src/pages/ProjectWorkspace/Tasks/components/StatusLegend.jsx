const StatusLegend = () => {
  return (
    <div id="status-legend">
      <h3 className="legend-title">Task Status</h3>
      <div className="legend-items">
        <div className="legend-item">
          <div className="legend-swatch status-completed" />
          <span className="legend-label">Completed</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch status-in-progress" />
          <span className="legend-label">In Progress</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch status-pending" />
          <span className="legend-label">Pending</span>
        </div>
      </div>
      
      <div className="legend-divider" />
      
      <h3 className="legend-title">Edge Colors (on hover)</h3>
      <div className="legend-items">
        <div className="legend-item">
          <div className="legend-swatch-line edge-outgoing" />
          <span className="legend-label">Dependents (outgoing)</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch-line edge-incoming" />
          <span className="legend-label">Prior tasks (incoming)</span>
        </div>
      </div>
    </div>
  );
};

export default StatusLegend;