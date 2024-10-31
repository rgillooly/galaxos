const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db'); // Adjust the path according to your structure

class User extends Model {}

User.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true, // Automatically increments the ID
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW, // Sets default to the current date and time
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW, // Sets default to the current date and time
    },
}, {
    sequelize,
    modelName: 'User',
    timestamps: false, // Disable automatic timestamps
});

// Update dateUpdated field before updating the user
User.beforeUpdate((user) => {
    user.dateUpdated = new Date(); // Set dateUpdated to current date and time
});

// Add a hook to set dateCreated when creating a user
User.beforeCreate((user) => {
    user.dateCreated = new Date(); // Set dateCreated to current date and time
});

module.exports = User;
