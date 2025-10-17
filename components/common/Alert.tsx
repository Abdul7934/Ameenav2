import React from 'react';
import { InformationCircleIcon, CheckCircleIcon, XCircleIcon } from '../icons/Icons';

interface AlertProps {
  type: 'info' | 'success' | 'error' | 'warning';
  title?: string;
  message: string;
  className?: string;
  style?: React.CSSProperties;
}

const alertIcons = {
  info: InformationCircleIcon,
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: InformationCircleIcon,
};

const Alert: React.FC<AlertProps> = ({ type, title, message, className, style }) => {
  const Icon = alertIcons[type];
  const typeClass = `alert-${type}`;

  return (
    <div
      role="alert"
      className={`alert ${typeClass} ${className || ''}`}
      style={style}
    >
      <Icon className="alert-icon" aria-hidden="true" />
      <div className="alert-content">
        {title && <h5>{title}</h5>}
        <p>
          {message}
        </p>
      </div>
    </div>
  );
};

export default Alert;