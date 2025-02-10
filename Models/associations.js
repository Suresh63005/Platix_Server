const TblOrganizationType = require("./TblOrganizationType.model");
const Organization = require("./Organization.model");
const OrderReports = require("./ReportsModel/OrderReport.model");
const User = require("./ReportsModel/User.model");
const Roles = require("./TblRoles.model");

Organization.belongsTo(TblOrganizationType, {
  foreignKey: "organizationType_id",
  as: "organizationType",
  onDelete:"CASCADE",
});

TblOrganizationType.hasMany(Organization, {
  foreignKey: "organizationType_id",
  onDelete:"CASCADE",
});

OrderReports.belongsTo(User, { foreignKey: "userUUID", as: "user" });
User.hasMany(OrderReports, { foreignKey: "userUUID", as: "orders" });

OrderReports.belongsTo(Organization, {
  foreignKey: "fromOrganization",
  as: "fromOrg",
});
Organization.hasMany(OrderReports, {
  foreignKey: "fromOrganization",
  as: "fromOrders",
});

OrderReports.belongsTo(Organization, {
  foreignKey: "toOrganization",
  as: "toOrg",
});
Organization.hasMany(OrderReports, {
  foreignKey: "toOrganization",
  as: "toOrders",
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
