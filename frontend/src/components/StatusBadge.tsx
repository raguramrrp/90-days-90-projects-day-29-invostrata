import React from 'react';
import { ValidationStatus } from '../types';

interface Props {
  status: ValidationStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'sm' }) => {
  const s = status.toUpperCase();
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  if (s === 'PASSED' || s === 'APPROVED') {
    return (
      <span className={`inline-flex items-center font-medium rounded border border-[#C2DDD0] bg-[#EAF3EE] text-[#286B55] ${px}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#286B55] mr-1.5" />
        {s === 'PASSED' ? 'Passed' : 'Approved'}
      </span>
    );
  }

  if (s === 'PASSED_WITH_WARNINGS') {
    return (
      <span className={`inline-flex items-center font-medium rounded border border-[#F3E2C4] bg-[#FEF7EC] text-[#B7791F] ${px}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#B7791F] mr-1.5" />
        Passed w/ Warnings
      </span>
    );
  }

  if (s === 'NEEDS_REVIEW') {
    return (
      <span className={`inline-flex items-center font-medium rounded border border-[#F3E2C4] bg-[#FEF7EC] text-[#B7791F] ${px}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#B7791F] mr-1.5" />
        Needs Review
      </span>
    );
  }

  if (s === 'DUPLICATE_SUSPECTED') {
    return (
      <span className={`inline-flex items-center font-medium rounded border border-[#F7C6C4] bg-[#FDF2F2] text-[#C2413B] ${px}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#C2413B] mr-1.5" />
        Duplicate Suspected
      </span>
    );
  }

  if (s === 'FAILED' || s === 'REJECTED') {
    return (
      <span className={`inline-flex items-center font-medium rounded border border-[#F7C6C4] bg-[#FDF2F2] text-[#C2413B] ${px}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#C2413B] mr-1.5" />
        {s === 'FAILED' ? 'Failed Validation' : 'Rejected'}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center font-medium rounded border border-border bg-gray-50 text-text-secondary ${px}`}>
      {status}
    </span>
  );
};
