import React from 'react';
import { ValidationStatus } from '../types';

interface Props {
  status: ValidationStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'sm' }) => {
  const s = status.toUpperCase();
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (s === 'PASSED' || s === 'APPROVED') {
    return (
      <span className={`inline-flex items-center font-medium rounded border border-[#BFE0CC] bg-[#EAF4ED] text-[#26764F] ${px}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#26764F] mr-1.5" />
        {s === 'PASSED' ? 'Passed' : 'Approved'}
      </span>
    );
  }

  if (s === 'PASSED_WITH_WARNINGS' || s === 'NEEDS_REVIEW') {
    return (
      <span className={`inline-flex items-center font-medium rounded border border-[#F5DFB8] bg-[#FFF3E1] text-[#C47B16] ${px}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#C47B16] mr-1.5" />
        {s === 'NEEDS_REVIEW' ? 'Needs Review' : 'Passed w/ Warnings'}
      </span>
    );
  }

  if (s === 'DUPLICATE_SUSPECTED') {
    return (
      <span className={`inline-flex items-center font-medium rounded border border-[#F3C8C5] bg-[#FBECEA] text-[#B83D37] ${px}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#B83D37] mr-1.5" />
        Duplicate Suspected
      </span>
    );
  }

  if (s === 'FAILED' || s === 'REJECTED') {
    return (
      <span className={`inline-flex items-center font-medium rounded border border-[#F3C8C5] bg-[#FBECEA] text-[#B83D37] ${px}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#B83D37] mr-1.5" />
        {s === 'FAILED' ? 'Failed' : 'Rejected'}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center font-medium rounded border border-border bg-surfaceMuted text-text-secondary ${px}`}>
      {status}
    </span>
  );
};
