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
    login,
    getIdeaUploaderByClientIdAndSocialAccountAndPostId,
    getAddMonthlyAmount,
    getAddVouchar,
    getClientData,
    staffDetials,
    getStaffDetailsById,
    postApprovedByClient,
    domNotifications,
    postRejectedByClient,
    postCorrectedByClient,
    newStaffDetials,
    getClientInfoByClientId,
    getActiveClient,
    getCurrentMonthFestivals,
    sendFestivalEmail,
    updateFestivalData,
    getClientEnrollmentBySocialAccount,
    getPostApprovedByClient,
    getUserLoginDetails,
    getFestivalNotifications,
    getBudgetDetails,
    sendMessage,
    createChatMessagesTable,
    getChatMessages,
    getNextMonthFestivals,
    getNextMonthFestivalsBasedOnSocialAccount,
    storeSelectedFestivalAndRemoveFromNotifications,
    getSelectedFestivalsBasedOnSocialAccount,
    getSelectedFestivals,
    postCorrectionByClient,
    getFinalBroadcast,
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
router.post('/idea-uploader-by-client-id-and-social-account-and-post-id', getIdeaUploaderByClientIdAndSocialAccountAndPostId);
router.get('/add-monthly-amount', getAddMonthlyAmount);
router.get('/add-vouchar', getAddVouchar);
router.post('/client-data', getClientData);
router.get('/staff-details', staffDetials);
router.get('/staff-details/:id', getStaffDetailsById);
router.post('/post-approved-by-client', postApprovedByClient);
router.get('/dom-notifications', domNotifications);
router.post('/post-reject-by-client', postRejectedByClient);
router.post('/post-corrected-by-client', postCorrectedByClient);
router.get('/new-staff-detials', newStaffDetials);
router.get('/client-info/:clientId', getClientInfoByClientId);
router.get('/active-client-data', getActiveClient);
router.get('/current-month-festivals', getCurrentMonthFestivals);
router.get('/send-monthly-notifications', sendFestivalEmail);
// Define the route for updating festival data
router.post('/update-festival-data', updateFestivalData);
router.get('/get-client-enrollment-by-social-account/:socialAccount', getClientEnrollmentBySocialAccount);
router.get('/post-approved-by-client/:socialAccount', getPostApprovedByClient);
router.get('/user-login-details', getUserLoginDetails);
router.get('/festival-notifications', getFestivalNotifications);
router.get('/budget-details/:socialAccount', getBudgetDetails);
router.post('/send-message', sendMessage);
router.post('/create-chat-messages-table', createChatMessagesTable);
router.get('/chat-messages', getChatMessages);
router.get('/next-month-festivals', getNextMonthFestivals);
router.get('/next-month-festivals-based-on-social-account/:socialAccount', getNextMonthFestivalsBasedOnSocialAccount);
router.post('/store-selected-festival-and-remove-from-notifications', storeSelectedFestivalAndRemoveFromNotifications);
router.get('/selected-festivals-based-on-social-account/:socialAccount', getSelectedFestivalsBasedOnSocialAccount);
router.get('/selected-festivals', getSelectedFestivals);
router.post('/post-correction-by-client', postCorrectionByClient);
router.get('/final-broad-case/:socialAccount',getFinalBroadcast)

module.exports = router;
