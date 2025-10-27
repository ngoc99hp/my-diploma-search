// utils/dateUtils.js - Frontend date formatting helpers

/**
 * ✅ Format ISO date (yyyy-MM-dd) to Vietnamese format (dd/MM/yyyy)
 * Use this when displaying dates from API
 * 
 * @param {string} isoDate - ISO format date "2024-06-20"
 * @returns {string} - Vietnamese format "20/06/2024"
 */
export function formatDateVN(isoDate) {
  if (!isoDate) return '';
  
  try {
    // PostgreSQL DATE returns yyyy-MM-dd
    const date = new Date(isoDate);
    
    // Check if valid date
    if (isNaN(date.getTime())) return isoDate;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Date format error:', error);
    return isoDate;
  }
}

/**
 * ✅ Format ISO date to long Vietnamese format
 * 
 * @param {string} isoDate - ISO format date "2024-06-20"
 * @returns {string} - "Ngày 20 tháng 06 năm 2024"
 */
export function formatDateLongVN(isoDate) {
  if (!isoDate) return '';
  
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    return `Ngày ${day} tháng ${month.toString().padStart(2, '0')} năm ${year}`;
  } catch (error) {
    console.error('Date format error:', error);
    return isoDate;
  }
}

/**
 * ✅ Parse Vietnamese date (dd/MM/yyyy) to ISO (yyyy-MM-dd)
 * Use this when sending dates to API
 * 
 * @param {string} vnDate - Vietnamese format "20/06/2024"
 * @returns {string} - ISO format "2024-06-20"
 */
export function parseVNDateToISO(vnDate) {
  if (!vnDate) return '';
  
  try {
    const parts = vnDate.split('/');
    if (parts.length !== 3) return vnDate;
    
    const [day, month, year] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    if (isNaN(date.getTime())) return vnDate;
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Date parse error:', error);
    return vnDate;
  }
}

/**
 * ✅ Validate Vietnamese date format
 * 
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} - true if valid
 */
export function isValidVNDate(dateStr) {
  if (!dateStr) return false;
  
  const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = dateStr.match(regex);
  
  if (!match) return false;
  
  const [, day, month, year] = match;
  const d = parseInt(day);
  const m = parseInt(month);
  const y = parseInt(year);
  
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (y < 1900 || y > 2100) return false;
  
  // Check valid date
  const date = new Date(y, m - 1, d);
  return date.getDate() === d && date.getMonth() === m - 1 && date.getFullYear() === y;
}

/**
 * ✅ Get current date in Vietnamese format
 * 
 * @returns {string} - Current date "25/10/2025"
 */
export function getCurrentDateVN() {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * ✅ Calculate age from birthdate
 * 
 * @param {string} isoDate - ISO format birthdate "2002-03-15"
 * @returns {number} - Age in years
 */
export function calculateAge(isoDate) {
  if (!isoDate) return 0;
  
  try {
    const birthDate = new Date(isoDate);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    return 0;
  }
}

/**
 * ✅ Format date for input field (yyyy-MM-dd)
 * 
 * @param {string} vnDate - Vietnamese format "20/06/2024"
 * @returns {string} - HTML input format "2024-06-20"
 */
export function formatForDateInput(vnDate) {
  if (!vnDate) return '';
  return parseVNDateToISO(vnDate);
}

/**
 * ✅ Format from input field to Vietnamese
 * 
 * @param {string} inputDate - HTML input format "2024-06-20"
 * @returns {string} - Vietnamese format "20/06/2024"
 */
export function formatFromDateInput(inputDate) {
  if (!inputDate) return '';
  return formatDateVN(inputDate);
}

// Example usage in React components:
/*
import { formatDateVN, formatDateLongVN, parseVNDateToISO } from '@/utils/dateUtils';

// Display date from API
<p>Ngày sinh: {formatDateVN(diploma.ngay_sinh)}</p>

// Display in certificate
<p>Cấp ngày {formatDateLongVN(diploma.ngay_cap_vbcc)}</p>

// Send date to API
const formData = {
  ngay_sinh: diploma.ngay_sinh_formatted || parseVNDateToISO(userInput)
};
*/