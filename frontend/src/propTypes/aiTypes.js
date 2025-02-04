import PropTypes from 'prop-types';

export const aiChatProps = {
  message: PropTypes.string,
  suggestions: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string,
      title: PropTypes.string,
      reason: PropTypes.string,
      example: PropTypes.string
    })
  ),
  onSend: PropTypes.func.isRequired
};

export const aiSuggestionProps = {
  suggestion: PropTypes.shape({
    type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    reason: PropTypes.string.isRequired,
    example: PropTypes.string
  }).isRequired,
  onApply: PropTypes.func.isRequired
};
