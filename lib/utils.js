exports.getAlarmPeriod = (ntType, ntTerm) => {
  var alarmPeriod = 0;
  if (ntType === "day") {
    alarmPeriod = ntTerm * 86400000;
  } else if (ntType === "days") {
    alarmPeriod = 604800000;
  } else if (ntType === "time") {
    alarmPeriod = ntTerm * 3600000;
  } else if (ntType === "once") {
    //INT_MAX(DB use INT type)
    alarmPeriod = 2147483647;
  }
  return alarmPeriod;
};