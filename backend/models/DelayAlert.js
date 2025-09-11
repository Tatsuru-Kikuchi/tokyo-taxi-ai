module.exports = (sequelize, DataTypes) => {
  return sequelize.define('DelayAlert', {
    userId: DataTypes.STRING,
    stationName: DataTypes.STRING,
    delays: DataTypes.TEXT,
    bookingId: DataTypes.STRING
  });
};
