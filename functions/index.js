const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

setGlobalOptions({
  region: "europe-west4",
  maxInstances: 10
});

exports.finalizeShiftEU = onCall(async (request) => {
  const { shiftId } = request.data || {};
  if (!shiftId) throw new Error("Missing shiftId");

  const earnings = Math.round((Math.random() * 100 + 20) * 100) / 100;
  logger.info("finalizeShiftEU called", { shiftId, earnings });
  return { earnings };
});