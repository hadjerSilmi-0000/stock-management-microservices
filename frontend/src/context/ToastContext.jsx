import { createContext, useContext, useState, useCallback } from 'react';
import Icon from '../components/ui/Icon';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const iconMap = { success: 'CheckCircle', error: 'XCircle', info: 'AlertCircle' };
  const colorMap = { success: '#4ade80', error: '#f87171', info: '#fb923c' };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <Icon name={iconMap[t.type]} size={16} style={{ color: colorMap[t.type], flexShrink: 0 }} />
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
