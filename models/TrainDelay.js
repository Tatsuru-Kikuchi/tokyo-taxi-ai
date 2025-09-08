module.exports = (sequelize, DataTypes) => {
  return sequelize.define('TrainDelay', {
    stationName: DataTypes.STRING,
    delays: DataTypes.TEXT,
    maxDelay: DataTypes.INTEGER,
    timestamp: DataTypes.DATE
  });
};
