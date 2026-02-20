/**
 * Validate Kenyan phone numbers
 * Accepts formats: 0712345678, 0112345678, 254712345678, +254711234567
 */
const validateKenyanPhone = (phone) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid Kenyan number
  let isValid = false;
  let formatted = '';
  
  if (cleaned.length === 9 && cleaned.startsWith('7')) {
    // Format: 712345678 -> 0712345678
    formatted = '0' + cleaned;
    isValid = true;
  } else if (cleaned.length === 10 && cleaned.startsWith('07')) {
    // Format: 0712345678
    formatted = cleaned;
    isValid = true;
  } else if (cleaned.length === 10 && cleaned.startsWith('01')) {
    // Format: 0112345678 (Safaricom new prefix)
    formatted = cleaned;
    isValid = true;
  } else if (cleaned.length === 12 && cleaned.startsWith('254')) {
    // Format: 254712345678 -> 0712345678
    formatted = '0' + cleaned.substring(3);
    isValid = true;
  } else if (cleaned.length === 13 && cleaned.startsWith('254')) {
    // Format: +254712345678 -> 0712345678
    formatted = '0' + cleaned.substring(4);
    isValid = true;
  }
  
  return { isValid, formatted };
};

module.exports = { validateKenyanPhone };