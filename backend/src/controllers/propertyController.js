const Property = require('../models/Property');
const User = require('../models/User');

const MAX_IMAGES_PER_PROPERTY = 10;

const isValidHttpUrl = (value) => {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s) return false;

  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const normalizeUrl = (value) => value.trim();

const createProperty = async (req, res) => {
  try {
    const landlordId = req.user._id;

    const property = await Property.create({
      ...req.body,
      landlordId,
      contactPerson: req.body.contactPerson || req.user.fullName,
      contactPhone: req.body.contactPhone || req.user.phoneNumber,
    });

    const updatedUser = await User.findByIdAndUpdate(
      landlordId,
      { $addToSet: { properties: property._id } },
      { new: true }
    ).select('properties');

    return res.status(201).json({
      success: true,
      message: 'Property created',
      data: {
        property,
        userProperties: updatedUser ? updatedUser.properties : [],
      },
    });
  } catch (error) {
    console.error('Create property error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const listProperties = async (req, res) => {
  try {
    const {
      location,
      area,
      propertyType,
      amenities,
      pets,
      children,
      visitors,
      minDepositMonths,
      maxDepositMonths,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
      sort = '-createdAt',
      q,
    } = req.query;

    const filter = { isActive: true };

    if (location) filter.location = { $regex: String(location).trim(), $options: 'i' };
    if (area) filter.area = { $regex: String(area).trim(), $options: 'i' };
    if (propertyType) filter.propertyType = String(propertyType).trim();

    if (amenities) {
      const list = String(amenities)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length) filter.amenities = { $all: list };
    }

    if (pets !== undefined) {
      if (String(pets) === 'true') filter['rules.pets'] = true;
      if (String(pets) === 'false') filter['rules.pets'] = false;
    }

    if (children !== undefined) {
      if (String(children) === 'true') filter['rules.children'] = true;
      if (String(children) === 'false') filter['rules.children'] = false;
    }

    if (visitors) filter['rules.visitors'] = String(visitors).trim();

    if (minDepositMonths !== undefined || maxDepositMonths !== undefined) {
      filter['rules.depositMonths'] = {};
      if (minDepositMonths !== undefined && String(minDepositMonths).trim() !== '') {
        filter['rules.depositMonths'].$gte = Number(minDepositMonths);
      }
      if (maxDepositMonths !== undefined && String(maxDepositMonths).trim() !== '') {
        filter['rules.depositMonths'].$lte = Number(maxDepositMonths);
      }
      if (Object.keys(filter['rules.depositMonths']).length === 0) delete filter['rules.depositMonths'];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined && String(minPrice).trim() !== '') filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined && String(maxPrice).trim() !== '') filter.price.$lte = Number(maxPrice);
      if (Object.keys(filter.price).length === 0) delete filter.price;
    }

    if (q) filter.$text = { $search: String(q).trim() };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    String(sort)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((field) => {
        if (field.startsWith('-')) sortObj[field.slice(1)] = -1;
        else sortObj[field] = 1;
      });

    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          primaryImage: {
            $let: {
              vars: {
                primary: {
                  $first: {
                    $filter: {
                      input: '$images',
                      as: 'img',
                      cond: { $eq: ['$$img.isPrimary', true] },
                    },
                  },
                },
                firstImg: { $first: '$images' },
              },
              in: { $ifNull: ['$$primary.url', '$$firstImg.url'] },
            },
          },
        },
      },
      {
        $project: {
          contactPerson: 0,
          contactPhone: 0,
          images: 0,
          __v: 0,
        },
      },
      { $sort: Object.keys(sortObj).length ? sortObj : { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
    ];

    const [properties, total] = await Promise.all([
      Property.aggregate(pipeline),
      Property.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        properties,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.max(1, Math.ceil(total / limitNum)),
        },
        applied: {
          location: location || null,
          area: area || null,
          propertyType: propertyType || null,
          amenities: amenities || null,
          pets: pets !== undefined ? String(pets) : null,
          children: children !== undefined ? String(children) : null,
          visitors: visitors || null,
          minDepositMonths: minDepositMonths !== undefined ? Number(minDepositMonths) : null,
          maxDepositMonths: maxDepositMonths !== undefined ? Number(maxDepositMonths) : null,
          minPrice: minPrice !== undefined ? Number(minPrice) : null,
          maxPrice: maxPrice !== undefined ? Number(maxPrice) : null,
          q: q || null,
          sort: String(sort),
        },
      },
    });
  } catch (error) {
    console.error('List properties error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching properties',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property || property.isActive === false) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const isOwner =
      req.user &&
      property.landlordId &&
      property.landlordId.toString() === req.user._id.toString();

    const data = property.toObject();

    if (!isOwner) {
      delete data.contactPerson;
      delete data.contactPhone;
    }

    return res.json({
      success: true,
      data: { property: data },
      visibility: isOwner ? 'owner' : 'public',
    });
  } catch (error) {
    console.error('Get property error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const listMyProperties = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    String(sort)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((field) => {
        if (field.startsWith('-')) sortObj[field.slice(1)] = -1;
        else sortObj[field] = 1;
      });

    const filter = { landlordId: req.user._id, isActive: true };

    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          primaryImage: {
            $let: {
              vars: {
                primary: {
                  $first: {
                    $filter: {
                      input: '$images',
                      as: 'img',
                      cond: { $eq: ['$$img.isPrimary', true] },
                    },
                  },
                },
                firstImg: { $first: '$images' },
              },
              in: { $ifNull: ['$$primary.url', '$$firstImg.url'] },
            },
          },
        },
      },
      { $project: { images: 0, __v: 0 } },
      { $sort: Object.keys(sortObj).length ? sortObj : { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
    ];

    const [properties, total] = await Promise.all([
      Property.aggregate(pipeline),
      Property.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        properties,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.max(1, Math.ceil(total / limitNum)),
        },
      },
    });
  } catch (error) {
    console.error('List my properties error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching my properties',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property || property.isActive === false) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const isOwner = property.landlordId.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ success: false, message: 'Forbidden' });

    const allowedFields = [
      'title',
      'description',
      'location',
      'area',
      'nearby',
      'propertyType',
      'price',
      'amenities',
      'rules',
      'contactPerson',
      'contactPhone',
      'isActive',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) property[field] = req.body[field];
    });

    await property.save();

    return res.json({
      success: true,
      message: 'Property updated',
      data: { property },
    });
  } catch (error) {
    console.error('Update property error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property || property.isActive === false) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const isOwner = property.landlordId.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ success: false, message: 'Forbidden' });

    property.isActive = false;
    await property.save();

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { properties: property._id },
    });

    return res.json({ success: true, message: 'Property removed' });
  } catch (error) {
    console.error('Delete property error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const addPropertyImage = async (req, res) => {
  try {
    const { url, isPrimary } = req.body || {};

    if (!isValidHttpUrl(url)) {
      return res.status(400).json({
        success: false,
        message: 'Valid image url is required (must start with http:// or https://)',
      });
    }

    const property = await Property.findById(req.params.id);
    if (!property || property.isActive === false) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const isOwner = property.landlordId.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ success: false, message: 'Forbidden' });

    if ((property.images || []).length >= MAX_IMAGES_PER_PROPERTY) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_IMAGES_PER_PROPERTY} images allowed per property`,
      });
    }

    const cleanUrl = normalizeUrl(url);

    const dup = (property.images || []).some(
      (img) => String(img.url).trim().toLowerCase() === cleanUrl.toLowerCase()
    );
    if (dup) return res.status(400).json({ success: false, message: 'Image already added' });

    const makePrimary = isPrimary === true || String(isPrimary) === 'true';
    if (makePrimary) {
      property.images = property.images.map((img) => ({ ...img.toObject(), isPrimary: false }));
    }

    property.images.push({ url: cleanUrl, isPrimary: makePrimary });

    if (property.images.length === 1 && !property.images[0].isPrimary) {
      property.images[0].isPrimary = true;
    }

    await property.save();

    return res.json({ success: true, message: 'Image added', data: { images: property.images } });
  } catch (error) {
    console.error('Add property image error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error adding image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const setPrimaryImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const property = await Property.findById(req.params.id);
    if (!property || property.isActive === false) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const isOwner = property.landlordId.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ success: false, message: 'Forbidden' });

    const exists = property.images.id(imageId);
    if (!exists) return res.status(404).json({ success: false, message: 'Image not found' });

    property.images = property.images.map((img) => ({
      ...img.toObject(),
      isPrimary: img._id.toString() === imageId,
    }));

    await property.save();

    return res.json({
      success: true,
      message: 'Primary image updated',
      data: { images: property.images },
    });
  } catch (error) {
    console.error('Set primary image error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error setting primary image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const removePropertyImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const property = await Property.findById(req.params.id);
    if (!property || property.isActive === false) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const isOwner = property.landlordId.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ success: false, message: 'Forbidden' });

    const imgDoc = property.images.id(imageId);
    if (!imgDoc) return res.status(404).json({ success: false, message: 'Image not found' });

    const wasPrimary = !!imgDoc.isPrimary;
    imgDoc.deleteOne();

    if (wasPrimary && property.images.length > 0) {
      property.images = property.images.map((img, idx) => ({
        ...img.toObject(),
        isPrimary: idx === 0,
      }));
    }

    if (!property.images.some((img) => img.isPrimary) && property.images.length > 0) {
      property.images[0].isPrimary = true;
    }

    await property.save();

    return res.json({ success: true, message: 'Image removed', data: { images: property.images } });
  } catch (error) {
    console.error('Remove property image error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error removing image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const addFavorite = async (req, res) => {
  try {
    const propertyId = req.params.id;

    const property = await Property.findById(propertyId).select('_id isActive');
    if (!property || property.isActive === false) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { favorites: propertyId } });

    return res.json({ success: true, message: 'Added to favorites' });
  } catch (error) {
    console.error('Add favorite error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error adding favorite',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const removeFavorite = async (req, res) => {
  try {
    const propertyId = req.params.id;

    await User.findByIdAndUpdate(req.user._id, { $pull: { favorites: propertyId } });

    return res.json({ success: true, message: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error removing favorite',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const listFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('favorites');

    if (!user?.favorites?.length) {
      return res.json({
        success: true,
        data: { properties: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } },
      });
    }

    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    String(sort)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((field) => {
        if (field.startsWith('-')) sortObj[field.slice(1)] = -1;
        else sortObj[field] = 1;
      });

    const match = { _id: { $in: user.favorites }, isActive: true };

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          primaryImage: {
            $let: {
              vars: {
                primary: {
                  $first: {
                    $filter: {
                      input: '$images',
                      as: 'img',
                      cond: { $eq: ['$$img.isPrimary', true] },
                    },
                  },
                },
                firstImg: { $first: '$images' },
              },
              in: { $ifNull: ['$$primary.url', '$$firstImg.url'] },
            },
          },
        },
      },
      { $project: { contactPerson: 0, contactPhone: 0, images: 0, __v: 0 } },
      { $sort: Object.keys(sortObj).length ? sortObj : { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
    ];

    const [properties, total] = await Promise.all([
      Property.aggregate(pipeline),
      Property.countDocuments(match),
    ]);

    return res.json({
      success: true,
      data: {
        properties,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.max(1, Math.ceil(total / limitNum)),
        },
      },
    });
  } catch (error) {
    console.error('List favorites error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching favorites',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
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
};
