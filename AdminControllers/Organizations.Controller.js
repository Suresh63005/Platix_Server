const { sequelize } = require("../config/db");
const { Sequelize, Op } = require("sequelize");
const TblOrganizationType = require("../Models/TblOrganizationType.model");
const Organization = require("../Models/Organization.model");
const uploadToS3 = require("../config/fileUpload.aws");
const { upsertOrganizationSchema, deleteOrganizationSchema, organizationGetByidSchema } = require("../Middlewares/validation");
const TblOrganization_Service = require("../Models/tblOrganizationService");
const Services = require("../Models/TblServices.model");
const axios = require("axios");
require('dotenv').config();



// Upsert (Create or Update) Organization
const generateToken = async () => {
    if (!process.env.CASHFREE_PAYOUTS_CLIENT_ID || !process.env.CASHFREE_PAYOUTS_CLIENT_SECRET) {
        throw new Error('CASHFREE_PAYOUTS_CLIENT_ID or CASHFREE_PAYOUTS_CLIENT_SECRET is not defined in the environment variables');
    }

    const tokenUrl =
        process.env.CASHFREE_ENV === 'production'
            ? 'https://payout-api.cashfree.com/payout/v1/authorize'
            : 'https://payout-gamma.cashfree.com/payout/v1/authorize';

    const headers = {
        'Content-Type': 'application/json',
        'X-Client-Id': process.env.CASHFREE_PAYOUTS_CLIENT_ID.trim(),
        'X-Client-Secret': process.env.CASHFREE_PAYOUTS_CLIENT_SECRET.trim(),
    };

    try {
        const response = await axios.post(tokenUrl, {}, { headers });
        if (response.data.status !== 'SUCCESS') {
            throw new Error(`Token generation failed: ${response.data.message} (SubCode: ${response.data.subCode})`);
        }
        console.log('Token Generated:', response.data);
        return response.data.data.token;
    } catch (error) {
        console.error('Error generating Cashfree token:', error.response?.data || error.message);
        if (error.message.includes('IP not whitelisted')) {
            throw new Error(`IP whitelisting required: ${error.message}. Please whitelist your IP in the Cashfree dashboard.`);
        }
        throw new Error(`Failed to generate Cashfree token: ${error.message}`);
    }
};

const validateIFSC = (ifscCode) => {
    const ifscRegex = /^[A-Za-z]{4}\d{7}$/; // IFSC code pattern
    if (!ifscRegex.test(ifscCode)) {
        return { valid: false, message: 'Invalid IFSC code format' };
    }
    return { valid: true, ifsc: ifscCode };
};

// Upsert (Create or Update) Organization
// const upsertOrganizations = async (req, res) => {
//     const uid = req.user?.id;
//     const {
//         id, addresses, businessName, description, designation, email, googleCoordinates,
//         gstNumber, mobile, name, registrationId, organizationType_id, whatsapp, bankName,
//         accountNumber, accountHolder, ifscCode, upiId, services, fileextras
//     } = req.body;

//     console.log(services,"yyyyyyyyyyyyyyyy");

//     const parsedServices = typeof services === "string" ? JSON.parse(services) : services;


//     console.log(parsedServices,"xxxxxxxxxxxx")
//     if (!Array.isArray(parsedServices)) {
//         return res.status(400).json({ error: "Invalid services format" });
//     }

//     let file1 = null;
//     let files = [];

//     // Upload file1 to S3
//     if (req.files?.file1) {
//         file1 = await uploadToS3(req.files.file1[0], "organization");
//     }

//     // Upload file2 to S3
//     if (req.files?.file2) {
//         for (const file of req.files.file2) {
//             const uploadedUrl = await uploadToS3(file, "Extraorganization");
//             files.push(uploadedUrl);
//         }
//     }

//     const transaction = await sequelize.transaction();

//     try {
//         let organization;

//         // ---------- UPDATE FLOW ----------
//         if (id) {
//             organization = await Organization.findByPk(id, { transaction });

//             if (!organization) {
//                 await transaction.rollback();
//                 return res.status(404).json({ error: "Organization not found" });
//             }

//             await organization.update({
//                 address: addresses,
//                 businessName,
//                 description,
//                 designation,
//                 email,
//                 googleCoordinates: JSON.parse(googleCoordinates),
//                 gstNumber,
//                 mobile,
//                 name,
//                 registrationId,
//                 organizationType_id,
//                 whatsapp,
//                 bankName,
//                 accountNumber,
//                 accountHolder,
//                 ifscCode,
//                 upiId,
//                 file1: file1 || organization.file1,
//                 file2: fileextras
//             }, { transaction });

//             if (files.length > 0) {
//                 let existingImages = organization.file2 ? organization.file2.split(",") : [];
//                 let updatedImages = [...existingImages, ...files];
//                 updatedImages = Array.from(new Set(updatedImages)).slice(0, 3);

//                 await organization.update({ file2: updatedImages.join(",") }, { transaction });
//             }

//             await transaction.commit();
//             return res.status(200).json({ message: "Organization updated successfully", data: organization });
//         }

//         // ---------- CREATE FLOW ----------
//         const organizationWithName = await Organization.findOne({ where: { name, organizationType_id } });
//         const organizationWithNumber = await Organization.findOne({ where: { mobile }, transaction });

//         if (organizationWithName) {
//             return res.status(400).json({ error: "Organization with this name already exists" });
//         } else if (organizationWithNumber) {
//             return res.status(400).json({ error: "Organization with this number already exists" });
//         }

//         // Parse addresses and get only the first one
//         const parsedAddresses = Array.isArray(addresses)
//             ? addresses
//             : (typeof addresses === "string" ? JSON.parse(addresses) : []);
//         const primaryAddress = parsedAddresses[0] || "N/A";

//         // Generate temporary beneficiary_id to satisfy NOT NULL
//         const tempBeneficiaryId = `temp_${Date.now()}`;

//         organization = await Organization.create({
//             address: addresses,
//             businessName,
//             description,
//             designation,
//             email,
//             googleCoordinates: JSON.parse(googleCoordinates),
//             gstNumber,
//             mobile,
//             name,
//             registrationId,
//             organizationType_id,
//             whatsapp,
//             bankName,
//             accountNumber,
//             accountHolder,
//             ifscCode,
//             upiId,
//             file1,
//             file2: files.join(","),
//             beneficiary_id: "NULL"
//         }, { transaction });

    
// console.log(parsedServices.length,"kkkkkkkkkkkkkkkkkkk")


//         if (parsedServices.length > 0) {

//             console.log("zzzzzzzzzzzzzz")
//             const serviceData = parsedServices.map(service => ({
//                 organization_id: organizationId,
//                 service_id: service.id,
//                 price: service.price
//             }));
//             await TblOrganization_Service.bulkCreate(serviceData, { transaction });
//             console.log("uuuuuuuuuuuuuuuuuuuuuuu")
//         }

//         await transaction.commit();
//         return res.status(201).json({ message: "Organization created successfully", data: organization });

//     } catch (error) {
//         console.error("Error inserting/updating organization:", error);
//         await transaction.rollback();
//         return res.status(500).json({ error: "Internal Server Error", details: error.message });
//     }
// };

// const upsertOrganizations = async (req, res) => {
//     const uid = req.user?.id;
//     const {
//         id, addresses, businessName, description, designation, email, googleCoordinates,
//         gstNumber, mobile, name, registrationId, organizationType_id, whatsapp, bankName,
//         accountNumber, accountHolder, ifscCode, upiId, services, fileextras
//     } = req.body;

//     const parsedServices = typeof services === "string" ? JSON.parse(services) : services;

//     if (!Array.isArray(parsedServices)) {
//         return res.status(400).json({ error: "Invalid services format" });
//     }

//     let file1 = null;
//     let files = [];

//     // Upload file1
//     if (req.files?.file1) {
//         file1 = await uploadToS3(req.files.file1[0], "organization");
//     }

//     // Upload file2
//     if (req.files?.file2) {
//         for (const file of req.files.file2) {
//             const uploadedUrl = await uploadToS3(file, "Extraorganization");
//             files.push(uploadedUrl);
//         }
//     }

//     const transaction = await sequelize.transaction();

//     try {
//         let organization;

//         // ------------ UPDATE FLOW ------------
//         if (id) {
//             organization = await Organization.findByPk(id, { transaction });

//             if (!organization) {
//                 await transaction.rollback();
//                 return res.status(404).json({ error: "Organization not found" });
//             }

//             await organization.update({
//                 address: addresses,
//                 businessName,
//                 description,
//                 designation,
//                 email,
//                 googleCoordinates: JSON.parse(googleCoordinates),
//                 gstNumber,
//                 mobile,
//                 name,
//                 registrationId,
//                 organizationType_id,
//                 whatsapp,
//                 bankName,
//                 accountNumber,
//                 accountHolder,
//                 ifscCode,
//                 upiId,
//                 file1: file1 || organization.file1,
//                 file2: fileextras
//             }, { transaction });

//             if (files.length > 0) {
//                 const existingImages = organization.file2 ? organization.file2.split(",") : [];
//                 const updatedImages = [...new Set([...existingImages, ...files])].slice(0, 3);
//                 await organization.update({ file2: updatedImages.join(",") }, { transaction });
//             }

//             // Update services in update flow (optional if needed)
//             await TblOrganization_Service.destroy({ where: { organization_id: organization.id }, transaction });
//             if (parsedServices.length > 0) {
//                 const serviceData = parsedServices.map(service => ({
//                     organization_id: organization.id,
//                     service_id: service.id,
//                     price: service.price
//                 }));
//                 await TblOrganization_Service.bulkCreate(serviceData, { transaction });
//             }

//             await transaction.commit();
//             return res.status(200).json({ message: "Organization updated successfully", data: organization });
//         }

//         // ------------ CREATE FLOW ------------
//         const organizationWithName = await Organization.findOne({ where: { name, organizationType_id } });
//         const organizationWithNumber = await Organization.findOne({ where: { mobile }, transaction });

//         if (organizationWithName) {
//             await transaction.rollback();
//             return res.status(400).json({ error: "Organization with this name already exists" });
//         } else if (organizationWithNumber) {
//             await transaction.rollback();
//             return res.status(400).json({ error: "Organization with this number already exists" });
//         }

//         const parsedAddresses = Array.isArray(addresses)
//             ? addresses
//             : (typeof addresses === "string" ? JSON.parse(addresses) : []);
//         const primaryAddress = parsedAddresses[0] || "N/A";

//         organization = await Organization.create({
//             address: addresses,
//             businessName,
//             description,
//             designation,
//             email,
//             googleCoordinates: JSON.parse(googleCoordinates),
//             gstNumber,
//             mobile,
//             name,
//             registrationId,
//             organizationType_id,
//             whatsapp,
//             bankName,
//             accountNumber,
//             accountHolder,
//             ifscCode,
//             upiId,
//             file1,
//             file2: files.join(","),
//             beneficiary_id: "NULL"
//         }, { transaction });

//         // 🛠️ Fix: Use `organization.id` after create
//         if (parsedServices.length > 0) {
//             const serviceData = parsedServices.map(service => ({
//                 organization_id: organization.id,
//                 service_id: service.id,
//                 price: service.price
//             }));
//             await TblOrganization_Service.bulkCreate(serviceData, { transaction });
//         }

//         await transaction.commit();
//         return res.status(201).json({ message: "Organization created successfully", data: organization });

//     } catch (error) {
//         console.error("Error inserting/updating organization:", error);
//         await transaction.rollback();
//         return res.status(500).json({ error: "Internal Server Error", details: error.message });
//     }
// };

const upsertOrganizations = async (req, res) => {
    const uid = req.user?.id;
    const {
        id, addresses, businessName, description, designation, email, googleCoordinates,
        gstNumber, mobile, name, registrationId, organizationType_id, whatsapp, bankName,
        accountNumber, accountHolder, ifscCode, upiId, services, fileextras
    } = req.body;

    const parsedServices = typeof services === "string" ? JSON.parse(services) : services;

    if (!Array.isArray(parsedServices)) {
        return res.status(400).json({ error: "Invalid services format" });
    }

    let file1 = null;
    let files = [];

    // Upload file1
    if (req.files?.file1) {
        file1 = await uploadToS3(req.files.file1[0], "organization");
    }

    // Upload file2
    if (req.files?.file2) {
        for (const file of req.files.file2) {
            const uploadedUrl = await uploadToS3(file, "Extraorganization");
            files.push(uploadedUrl);
        }
    }

    const transaction = await sequelize.transaction();

    try {
        let organization;

        // ------------ UPDATE FLOW ------------
        if (id) {
            organization = await Organization.findByPk(id, { transaction });

            if (!organization) {
                await transaction.rollback();
                return res.status(404).json({ error: "Organization not found" });
            }

            await organization.update({
                address: addresses,
                businessName,
                description,
                designation,
                email,
                googleCoordinates: JSON.parse(googleCoordinates),
                gstNumber,
                mobile,
                name,
                registrationId,
                organizationType_id,
                whatsapp,
                bankName,
                accountNumber,
                accountHolder,
                ifscCode,
                upiId,
                file1: file1 || organization.file1,
                file2: fileextras
            }, { transaction });

            if (files.length > 0) {
                const existingImages = organization.file2 ? organization.file2.split(",") : [];
                const updatedImages = [...new Set([...existingImages, ...files])].slice(0, 3);
                await organization.update({ file2: updatedImages.join(",") }, { transaction });
            }

            // Update services in update flow
            const existingServices = await TblOrganization_Service.findAll({
                where: { organization_id: organization.id },
                transaction
            });

            const existingServiceMap = new Map(
                existingServices.map(s => [s.service_id, s])
            );

            const incomingServiceMap = new Map(
                parsedServices.map(s => [s.id, s])
            );

            // 1. Update or create services
            const serviceUpserts = parsedServices.map(async (service) => {
                const existingService = existingServiceMap.get(service.id);
                if (existingService) {
                    // Update existing service (e.g., price)
                    await existingService.update(
                        { price: service.price },
                        { transaction }
                    );
                } else {
                    // Create new service
                    await TblOrganization_Service.create(
                        {
                            organization_id: organization.id,
                            service_id: service.id,
                            price: service.price
                        },
                        { transaction }
                    );
                }
            });

            await Promise.all(serviceUpserts);

            // 2. Remove services that are no longer included
            const servicesToDelete = existingServices.filter(
                s => !incomingServiceMap.has(s.service_id)
            );

            if (servicesToDelete.length > 0) {
                await TblOrganization_Service.destroy({
                    where: {
                        organization_id: organization.id,
                        service_id: servicesToDelete.map(s => s.service_id)
                    },
                    transaction
                });
            }

            await transaction.commit();
            return res.status(200).json({ message: "Organization updated successfully", data: organization });
        }

        // ------------ CREATE FLOW ------------
        const organizationWithName = await Organization.findOne({ where: { name, organizationType_id } });
        const organizationWithNumber = await Organization.findOne({ where: { mobile }, transaction });

        if (organizationWithName) {
            await transaction.rollback();
            return res.status(400).json({ error: "Organization with this name already exists" });
        } else if (organizationWithNumber) {
            await transaction.rollback();
            return res.status(400).json({ error: "Organization with this number already exists" });
        }

        const parsedAddresses = Array.isArray(addresses)
            ? addresses
            : (typeof addresses === "string" ? JSON.parse(addresses) : []);
        const primaryAddress = parsedAddresses[0] || "N/A";

        organization = await Organization.create({
            address: addresses,
            businessName,
            description,
            designation,
            email,
            googleCoordinates: JSON.parse(googleCoordinates),
            gstNumber,
            mobile,
            name,
            registrationId,
            organizationType_id,
            whatsapp,
            bankName,
            accountNumber,
            accountHolder,
            ifscCode,
            upiId,
            file1,
            file2: files.join(","),
            beneficiary_id: "NULL"
        }, { transaction });

        if (parsedServices.length > 0) {
            const serviceData = parsedServices.map(service => ({
                organization_id: organization.id,
                service_id: service.id,
                price: service.price
            }));
            await TblOrganization_Service.bulkCreate(serviceData, { transaction });
        }

        await transaction.commit();
        return res.status(201).json({ message: "Organization created successfully", data: organization });

    } catch (error) {
        console.error("Error inserting/updating organization:", error);
        await transaction.rollback();
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};








const getAll = async (req, res) => {
    console.log("Fetching organizations...");

    const { page = 1, limit = 10, filter = "", search = "" } = req.query;
    console.log(req.query);
    const offset = (page - 1) * limit;

    const whereCondition = {};

    if (search) {
        console.log("Applying search filter...");
        whereCondition[Op.or] = [
            { "$organizationType.organizationType$": { [Op.like]: `%${search}%` } },
            { name: { [Op.like]: `%${search}%` } },
            { mobile: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
        ];
    }

    // If filter is not "all" and is not empty, apply filtering
    if (filter && filter !== "all") {
        whereCondition.organizationType_id = filter;
    }

    try {
        const { rows: organizations, count: total } = await Organization.findAndCountAll({
            where: whereCondition,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [["createdAt", "DESC"]],
            include: [
                {
                    model: TblOrganizationType,
                    as: "organizationType",
                    attributes: ["id", "organizationType"]
                }
            ]
        });

        res.status(200).json({
            message: "All Organizations Retrieved",
            data: organizations,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching organizations:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};



const deleteOrganization = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { error } = deleteOrganizationSchema.validate({ ...req.params, ...req.query });
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { id } = req.params;
        const { forceDelete } = req.query;

        // Find the parent organization
        const organization = await Organization.findOne({ where: { id }, paranoid: true, transaction: t });

        if (!organization) {
            await t.rollback();
            return res.status(404).json({ error: "Organization not found!" });
        }

        if (organization.deletedAt && forceDelete !== "true") {
            await t.rollback();
            return res.status(400).json({ error: "Organization is already soft deleted." });
        }

        // 🔥 Delete related child records first
        await TblOrganization_Service.destroy({
            where: { organization_id: id },
            transaction: t,
        });

        // 🔥 Now delete the parent organization
        if (forceDelete === "true") {
            await organization.destroy({ force: true, transaction: t }); // Hard delete
        } else {
            await organization.destroy({ transaction: t }); // Soft delete
        }

        await t.commit();
        return res.status(200).json({
            message: forceDelete === "true"
                ? "Organization and related services permanently deleted!"
                : "Organization and related services soft-deleted!"
        });

    } catch (error) {
        await t.rollback();
        console.error("Error deleting organization:", error);
        return res.status(500).json({ error: "An error occurred while deleting the organization." });
    }
};

const organizationGetByid = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { error } = organizationGetByidSchema.validate({ ...req.params });
        if (error) {
            await t.rollback();
            return res.status(400).json({ message: error.details[0].message });
        }

        const { id } = req.params;

        // Fetch organization
        const organization = await Organization.findByPk(id, { transaction: t });

        if (!organization) {
            await t.rollback();
            return res.status(404).json({ error: "Organization not found" });
        }

        // Fetch associated services from TblOrganization_Service
        const services = await TblOrganization_Service.findAll({
            where: { organization_id: id },
            transaction: t
        });

        // Fetch details of services from Services table
        const serviceIds = services.map(service => service.service_id); // Extract service_ids

        // Now fetch details of these services
        const serviceDetails = await Services.findAll({
            where: {
                id: serviceIds
            },
            transaction: t
        });

        // Parse stored file2 if applicable
        const formattedOrganization = {
            ...organization.toJSON(),
            file2: organization.file2 ? organization.file2.split(",") : []
        };

        await t.commit();

        return res.status(200).json({
            message: "Organization Retrieved",
            data: {
                ...formattedOrganization,
                services: services.map(service => {
                    // Combine the service data with the actual service details
                    const serviceDetail = serviceDetails.find(detail => detail.id === service.service_id);
                    return {
                        ...service.toJSON(),
                        serviceDetail: serviceDetail ? serviceDetail.toJSON() : null
                    };
                })
            }
        });

    } catch (error) {
        await t.rollback();
        console.error("Error retrieving organization:", error);
        return res.status(500).json({ error: "An error occurred while retrieving the organization." });
    }
};

module.exports = { upsertOrganizations, getAll, deleteOrganization, organizationGetByid }