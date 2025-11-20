import { useEffect } from 'react';

const ValidationNotification = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getNotificationStyle = () => {
    const baseStyle = {
      position: 'fixed',
      top: '20px',
      right: '20px',
      maxWidth: '450px',
      padding: '16px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 100000,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      animation: 'slideIn 0.3s ease-out',
    };

    if (notification.type === 'error') {
      return {
        ...baseStyle,
        backgroundColor: '#fee',
        borderLeft: '4px solid #e53e3e',
      };
    } else if (notification.type === 'warning') {
      return {
        ...baseStyle,
        backgroundColor: '#fef3cd',
        borderLeft: '4px solid #ff9800',
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: '#eef9f6',
        borderLeft: '4px solid #2fff00',
      };
    }
  };

  const getTitleStyle = () => {
    let color = '#333';
    if (notification.type === 'error') color = '#e53e3e';
    if (notification.type === 'warning') color = '#ff9800';
    if (notification.type === 'success') color = '#2fff00';

    return {
      fontWeight: 600,
      fontSize: '14px',
      color,
      margin: '0 0 4px 0',
    };
  };

  const getIconStyle = () => {
    let color = '#333';
    if (notification.type === 'error') color = '#e53e3e';
    if (notification.type === 'warning') color = '#ff9800';
    if (notification.type === 'success') color = '#2fff00';

    return {
      fontSize: '20px',
      color,
      minWidth: '20px',
      marginTop: '2px',
    };
  };

  const getIcon = () => {
    if (notification.type === 'error') return '⚠️';
    if (notification.type === 'warning') return '⚡';
    if (notification.type === 'success') return '✓';
    return 'ℹ️';
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(500px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(500px);
            opacity: 0;
          }
        }
      `}</style>
      <div style={getNotificationStyle()}>
        <div style={getIconStyle()}>{getIcon()}</div>
        <div style={{ flex: 1 }}>
          <div style={getTitleStyle()}>{notification.title}</div>
          <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
            {notification.message}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#999',
            padding: '0',
            minWidth: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>
    </>
  );
};

export default ValidationNotification;
