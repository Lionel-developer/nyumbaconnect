const express = require('express');
const router = express.Router();

const protect = require('../middleware/protect');
const optionalProtect = require('../middleware/optionalProtect');
const requireRole = require('../middleware/requireRole');
const uploadImage = require('../middleware/uploadImage');

const {
  createProperty,
  listProperties,
  getPropertyById,
  listMyProperties,
  updateProperty,
  deleteProperty,
  addPropertyImage,
  setPrimaryImage,
  removePropertyImage,
  addFavorite,
  removeFavorite,
  listFavorites,
  uploadPropertyImage,
  unlockProperty,
} = require('../controllers/propertyController');

// Public
router.get('/', listProperties);

// Tenant
router.get('/favorites', protect, requireRole('tenant'), listFavorites);

// Landlord/Agent
router.get('/mine', protect, requireRole('landlord', 'agent'), listMyProperties);

// Actions
router.post('/:id/unlock', protect, requireRole('tenant'), unlockProperty);
router.post('/:id/favorite', protect, requireRole('tenant'), addFavorite);
router.delete('/:id/favorite', protect, requireRole('tenant'), removeFavorite);

// CRUD
router.post('/', protect, requireRole('landlord', 'agent'), createProperty);

// Images (landlord/agent)
router.post('/:id/images', protect, requireRole('landlord', 'agent'), addPropertyImage);
router.patch(
  '/:id/images/:imageId/primary',
  protect,
  requireRole('landlord', 'agent'),
  setPrimaryImage
);
router.delete('/:id/images/:imageId', protect, requireRole('landlord', 'agent'), removePropertyImage);
router.post(
  '/:id/images/upload',
  protect,
  requireRole('landlord', 'agent'),
  uploadImage.single('image'),
  uploadPropertyImage
);

// ✅ Keep :id route last
router.get('/:id', optionalProtect, getPropertyById);
router.put('/:id', protect, requireRole('landlord', 'agent'), updateProperty);
router.delete('/:id', protect, requireRole('landlord', 'agent'), deleteProperty);

module.exports = router;