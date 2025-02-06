// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/db');

// const Organization = sequelize.define('Organization', {
//   id: {
//     type: DataTypes.UUID,
//     allowNull: false,
//     primaryKey: true,
//     defaultValue: DataTypes.UUIDV4,
//   },
//   name: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   type: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   address: {
//     type: DataTypes.STRING,
//   },
//   googleCoordinates: {
//     type: DataTypes.JSON,
//   },
//   mobile: {
//     type: DataTypes.STRING,
//   },
//   whatsapp: {
//     type: DataTypes.STRING,
//   },
//   email: {
//     type: DataTypes.STRING,
//     validate: {
//       isEmail: true,
//     },
//   },
//   description: {
//     type: DataTypes.TEXT,
//   },
//   gstNumber: {
//     type: DataTypes.STRING,
//   },
//   designation: {
//     type: DataTypes.STRING,
//   },
//   businessName: {
//     type: DataTypes.STRING,
//   },
//   registrationId: {
//     type: DataTypes.STRING,
//   },
//   file1: {
//     type: DataTypes.TEXT,
//     allowNull: false,
//   },
//   file2: {
//     type: DataTypes.JSON,
//     allowNull: true,
//   },
// }, {
//   tableName: "Organization",
//   timestamps: true,
//   paranoid: true,
//   charset: "utf8mb4",
//   collate: "utf8mb4_general_ci",
// });

// module.exports = Organization;


const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
  },
  googleCoordinates: {
    type: DataTypes.JSON,
  },
  mobile: {
    type: DataTypes.STRING,
  },
  whatsapp: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
  },
  gstNumber: {
    type: DataTypes.STRING,
  },
  designation: {
    type: DataTypes.STRING,
  },
  businessName: {
    type: DataTypes.STRING,
  },
  registrationId: {
    type: DataTypes.STRING,
  },
  file1: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  file2: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  // New columns
  admin_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  accountHolder: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ifscCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  upiId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: "Organization",
  timestamps: true,
  paranoid: true,
  charset: "utf8mb4",
  collate: "utf8mb4_general_ci",
});

module.exports = Organization;
