const express = require('express');
const {
    getClients,
    getNonRepeatedClients,
    getUniqueRecords,
    getDuplicateRecords,
    getClientEnrollment,
    getIdeaUploader,
    getPostSchedular,
    getIdeaUploaderByClientId,
    getPlans,
    getPannsByPlanId,
    getClientEnrollmentByClientId,
    getIdeaUploaderByClientIdAndSocialAccount,
    getActiveClients,
    login
} = require('../controllers/clientController');

const router = express.Router();

// Define routes
router.get('/clients', getClients);
router.post('/login', login);
router.get('/non-repeated-clients', getNonRepeatedClients);
router.get('/active-clients', getActiveClients);
router.get('/unique-records', getUniqueRecords);
router.get('/duplicate-records', getDuplicateRecords);
router.get('/client-enrollment', getClientEnrollment);
router.get('/idea-uploader', getIdeaUploader);
router.get('/post-schedular', getPostSchedular);
router.get('/idea-uploader/:clientId', getIdeaUploaderByClientId);
router.get('/plans', getPlans);
router.get('/get-plans-by-plan-id/:planId', getPannsByPlanId);
router.get('/client-enrollment/:clientId', getClientEnrollmentByClientId);
router.post('/idea-uploader-by-client-id-and-social-account', getIdeaUploaderByClientIdAndSocialAccount);

module.exports = router;
