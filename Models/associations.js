const TblOrganizationType = require("./TblOrganizationType.model");
const Organization = require("./Organization.model");
const OrderReports = require("./ReportsModel/OrderReport.model");
const User = require("./ReportsModel/User.model");
const Roles = require("./TblRoles.model");
const Services = require("./TblServices.model");

Organization.belongsTo(TblOrganizationType, {
  foreignKey: "organizationType_id",
  as: "organizationType",
  onDelete:"CASCADE",
});

TblOrganizationType.hasMany(Organization, {
  foreignKey: "organizationType_id",
  onDelete:"CASCADE",
});

User.hasMany(OrderReports, { foreignKey: "userUUID", as: "orders" }); 
OrderReports.belongsTo(User, { foreignKey: "userUUID", as: "user" });

// OrderReports.belongsTo(TblOrganizationType, {
//   foreignKey: "fromOrganization",
//   as: "fromOrg",
// });
// Organization.hasMany(OrderReports, {
//   foreignKey: "fromOrganization",
//   as: "fromOrders",
// });

// Organization.hasMany(OrderReports, {
//   foreignKey: "toOrganization",
//   as: "toOrders",
// });

// OrderReports.belongsTo(TblOrganizationType, {
//   foreignKey: "toOrganization",
//   as: "toOrg",
// });
OrderReports.belongsTo(TblOrganizationType, {
  foreignKey: "fromOrganization",
  as: "fromOrg",
});

OrderReports.belongsTo(TblOrganizationType, {
  foreignKey: "toOrganization",
  as: "toOrg",
});



User.belongsTo(TblOrganizationType, {
  foreignKey: "organizationType_id",
  as: "organizationType1",
});
TblOrganizationType.hasMany(User, { foreignKey: "organizationType_id" });

User.belongsTo(Organization, {
  foreignKey: "organization_id",
  as: "organization",
});
Organization.hasMany(User, {
  foreignKey: "organization_id",
  as: "users",
});

User.belongsTo(Roles, { foreignKey: "role_id", as: "role" });
Roles.hasMany(User, { foreignKey: "role_id", as: "users" });

// TblOrganizationType.hasMany(Services,{foreignKey:"service_id", as:"services"})
// Services.belongsTo(TblOrganizationType,{foreignKey:"service_id"})

TblOrganizationType.belongsToMany(Services, {
  through: "OrganizationTypeServices", // Correct junction table
  as: "services",
  foreignKey: "organizationType_id", // Correct foreign key
  otherKey: "service_id",
});

Services.belongsToMany(TblOrganizationType, {
  through: "OrganizationTypeServices",
  as: "organizationTypes",
  foreignKey: "service_id",
  otherKey: "organizationType_id",
});




