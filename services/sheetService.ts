import { AnalyzedPost } from "../types";

export const saveToSheet = async (post: AnalyzedPost, scriptUrl: string): Promise<void> => {
  if (!scriptUrl) {
    throw new Error("Google Apps Script URL is missing.");
  }

  // Google Apps Script Web Apps often have CORS issues when called directly from browser JS 
  // without 'no-cors' mode or proper setup. However, 'no-cors' prevents reading the response.
  // The standard way for a simple collection form is to use fetch with POST text/plain to avoid preflight 
  // if the backend is set up to handle it, or standard JSON.
  
  // We will assume the standard `doPost` in GAS handles JSON.
  // Note: standard fetch to GAS often requires `mode: 'no-cors'` if the script doesn't handle OPTIONS.
  // But we want to try to confirm success.
  
  try {
    // We use no-cors to ensure the request actually goes through from a browser client to a GAS script
    // which usually doesn't support strict CORS headers for generic origins.
    // The trade-off is we can't read the response content, but we assume success if no network error.
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
    });
    
    // Since we used no-cors, we can't check response.ok. We assume if fetch didn't throw, it was sent.
    return;
  } catch (error) {
    console.error("Sheet save error:", error);
    throw new Error("Failed to save to Google Sheet.");
  }
};
