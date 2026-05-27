import type { ListingStatus } from '../types/listing';

export type StatusConfig = {
  label: string;
  background: string;
  color: string;
  border: string;
  colorDark?: string;
};

export const STATUS_CONFIG: Record<ListingStatus, StatusConfig> = {
  new: {
    label: 'New',
    background: '#e8f0fe',
    color: '#1a56db',
    border: '#667eea',
    colorDark: '#1a56db',
  },
  shortlisted: {
    label: 'Shortlisted',
    background: '#e7f8ef',
    color: '#0f6d3f',
    border: '#43e97b',
    colorDark: '#0f6d3f',
  },
  contacted: {
    label: 'Contacted',
    background: '#fff4e5',
    color: '#9a5b00',
    border: '#f09819',
    colorDark: '#9a5b00',
  },
  follow_up: {
    label: 'Follow up',
    background: '#f3e8ff',
    color: '#6b21a8',
    border: '#764ba2',
    colorDark: '#6b21a8',
  },
  rejected: {
    label: 'Rejected',
    background: '#fdecec',
    color: '#b42318',
    border: '#ff5858',
    colorDark: '#b42318',
  },
  closed: {
    label: 'Closed',
    background: '#e0e7ff',
    color: '#3730a3',
    border: '#667eea',
    colorDark: '#3730a3',
  },
};

export function isListingStatus(value: string): value is ListingStatus {
  return value in STATUS_CONFIG;
}
