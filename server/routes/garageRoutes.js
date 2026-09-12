const express = require('express');
const router = express.Router();
const GarageController = require('../controllers/garageController');
const { optionalToken } = require('../middleware/auth');

router.get('/catalog', GarageController.getCatalog);
router.get('/my-vehicles', optionalToken, GarageController.getPlayerVehicles);
router.post('/buy', optionalToken, GarageController.buyVehicle);
router.post('/upgrade', optionalToken, GarageController.buyUpgrade);
router.post('/repair/:playerVehicleId', optionalToken, GarageController.repairVehicle);
router.post('/setup', optionalToken, GarageController.saveSetup);
router.post('/set-active', optionalToken, GarageController.setActiveVehicle);

module.exports = router;
