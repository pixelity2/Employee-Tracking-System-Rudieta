// Modular v2 Firebase Functions API
const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Set default region and max instances for all functions
setGlobalOptions({
  region: 'europe-west4', // ✅ Netherlands
  maxInstances: 10
});

// Sample callable function: finalizeShift
exports.finalizeShiftEU = onCall((request) => {
  const { shiftId } = request.data;
  if (!shiftId) {
    throw new Error("Missing shiftId");
  }

  // Simulate earnings calculation (replace with real logic)
  const earnings = Math.floor(Math.random() * 100) + 20;

  logger.info(`Finalizing shift ${shiftId} with earnings: €${earnings}`);

  return { earnings };
});