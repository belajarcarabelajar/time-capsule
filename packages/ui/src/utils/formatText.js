import DOMPurify from 'isomorphic-dompurify';

const formatText = (text) => {
  if (!text) return "";
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<i>$1</i>');
  return DOMPurify.sanitize(formatted);
};

export { formatText };
