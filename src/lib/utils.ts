import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function censorContactInfo(text: string): { censoredText: string; isCensored: boolean } {
  let isCensored = false;

  // Regex for email addresses
  const emailRegex = /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/gi;
  
  // A general phone number regex that looks for sequences of 7 or more digits, possibly with separators
  const phoneRegex = /(\+?\d{1,4}?[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?[\d\s.-]{7,}/g;

  let censoredText = text.replace(emailRegex, () => {
    isCensored = true;
    return '[EMAIL HIDDEN]';
  });

  censoredText = censoredText.replace(phoneRegex, (match) => {
    // Avoid censoring short numbers, prices, or IDs by checking the digit count
    if (match.replace(/\D/g, '').length >= 7) {
        isCensored = true;
        return '[CONTACT INFO HIDDEN]';
    }
    return match;
  });

  return { censoredText, isCensored };
}
