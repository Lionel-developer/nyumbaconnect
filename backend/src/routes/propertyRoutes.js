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

router.get('/', listProperties);
router.get('/my-properties', protect, requireRole('landlord', 'agent'), listMyProperties);

router.post('/:id/unlock', protect, requireRole('tenant'), unlockProperty);

router.get('/favorites', protect, requireRole('tenant'), listFavorites);
router.post('/:id/favorite', protect, requireRole('tenant'), addFavorite);
router.delete('/:id/favorite', protect, requireRole('tenant'), removeFavorite);

router.get('/:id', optionalProtect, getPropertyById);
router.post('/', protect, requireRole('landlord', 'agent'), createProperty);
router.put('/:id', protect, requireRole('landlord', 'agent'), updateProperty);
router.delete('/:id', protect, requireRole('landlord', 'agent'), deleteProperty);

router.post('/:id/images', protect, requireRole('landlord', 'agent'), addPropertyImage);
router.patch('/:id/images/:imageId/primary', protect, requireRole('landlord', 'agent'), setPrimaryImage);
router.delete('/:id/images/:imageId', protect, requireRole('landlord', 'agent'), removePropertyImage);
router.post(
  '/:id/images/upload',
  protect,
  requireRole('landlord', 'agent'),
  uploadImage.single('image'),
  uploadPropertyImage
);
module.exports = router;
