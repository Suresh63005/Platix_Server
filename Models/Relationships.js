// Sequelize Relationships File
const Organization = require('./organizationmodel');
const OrganizationType = require('./organizationtypemodel');
const User = require('./usermodel');
const Service = require('./serivcemodel');
const {sequelize} = require('./db');


// Define Relationships
// An Organization has a type (one-to-many relationship with OrganizationType)
Organization.belongsTo(OrganizationType, {
  foreignKey: 'typeId',
  as: 'organizationType',
});
OrganizationType.hasMany(Organization, {
  foreignKey: 'typeId',
  as: 'organizations',
});

// A User belongs to an Organization (many-to-one relationship)
User.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'users',
});
Organization.hasMany(User, {
  foreignKey: 'organizationId',
  as: 'users',
});

// A Service belongs to an Organization (many-to-one relationship)
Service.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});
Organization.hasMany(Service, {
  foreignKey: 'organizationId',
  as: 'services',
});

module.exports = {
  Organization,
  OrganizationType,
  User,
  Service,
};
