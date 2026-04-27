export const formatDateTime = (value) => {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
};

export const buildSigner = ({
  name = '',
  title = '',
  lookupPosition = '',
} = {}) => ({
  name,
  title,
  lookupPosition,
});