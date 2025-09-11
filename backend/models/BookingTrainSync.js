module.exports = (sequelize, DataTypes) => {
  return sequelize.define('BookingTrainSync', {
    bookingId: DataTypes.STRING,
    stationName: DataTypes.STRING,
    hasDelay: DataTypes.BOOLEAN,
    delayMinutes: DataTypes.INTEGER,
    autoBooked: DataTypes.BOOLEAN,
    syncedAt: DataTypes.DATE
  });
};
