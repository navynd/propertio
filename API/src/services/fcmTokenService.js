const mongoose = require('mongoose');
const UsersModel = require('../models/usersModel');
const AgentsModel = require('../models/agentsModel');
const AgenciesModel = require('../models/agenciesModel');
const DevelopersModel = require('../models/developersModel');

const PLATFORMS = ['web', 'android', 'ios'];
const RECIPIENT_TYPES = ['user', 'agent', 'agency', 'developer'];

const MODEL_BY_TYPE = {
  user: UsersModel,
  agent: AgentsModel,
  agency: AgenciesModel,
  developer: DevelopersModel,
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getModelByType = (recipientType) => {
  const model = MODEL_BY_TYPE[recipientType];
  if (!model) {
    throw new Error(`recipientType must be one of: ${RECIPIENT_TYPES.join(', ')}`);
  }
  return model;
};

const removeTokenFromOtherRecipients = async (recipientType, token, excludeId) => {
  const trimmed = String(token || '').trim();
  if (!trimmed) return;

  await Promise.all(
    RECIPIENT_TYPES.map((type) =>
      getModelByType(type).updateMany(
        {
          _id: type === recipientType ? { $ne: excludeId } : { $exists: true },
          'fcmTokens.token': trimmed,
        },
        { $pull: { fcmTokens: { token: trimmed } } },
      ),
    ),
  );
};

const registerFcmToken = async (recipientType, recipientId, payload = {}) => {
  const model = getModelByType(recipientType);

  if (!isValidObjectId(recipientId)) {
    throw new Error('Invalid recipient id');
  }

  const token = typeof payload.token === 'string' ? payload.token.trim() : '';
  const platform = payload.platform;
  if (!token) throw new Error('token is required');
  if (!PLATFORMS.includes(platform)) {
    throw new Error(`platform must be one of: ${PLATFORMS.join(', ')}`);
  }

  const deviceId =
    payload.deviceId != null && String(payload.deviceId).trim() !== ''
      ? String(payload.deviceId).trim()
      : undefined;
  const deviceModel =
    payload.deviceModel != null && String(payload.deviceModel).trim() !== ''
      ? String(payload.deviceModel).trim()
      : undefined;
  const deviceVersion =
    payload.deviceVersion != null && String(payload.deviceVersion).trim() !== ''
      ? String(payload.deviceVersion).trim()
      : undefined;

  await removeTokenFromOtherRecipients(recipientType, token, recipientId);

  const recipient = await model.findById(recipientId).select('fcmTokens');
  if (!recipient) throw new Error('Recipient not found');

  const list = recipient.fcmTokens || [];
  const now = new Date();

  const byTokenIdx = list.findIndex((t) => t.token === token);
  if (byTokenIdx >= 0) {
    list[byTokenIdx].lastSeenAt = now;
    list[byTokenIdx].updatedAt = now;
    list[byTokenIdx].platform = platform;
    list[byTokenIdx].isActive = true;
    if (deviceId !== undefined) list[byTokenIdx].deviceId = deviceId;
    if (deviceModel !== undefined) list[byTokenIdx].deviceModel = deviceModel;
    if (deviceVersion !== undefined) list[byTokenIdx].deviceVersion = deviceVersion;
  } else if (deviceId) {
    const byDeviceIdx = list.findIndex((t) => t.deviceId === deviceId && t.platform === platform);
    if (byDeviceIdx >= 0) {
      list[byDeviceIdx].token = token;
      list[byDeviceIdx].lastSeenAt = now;
      list[byDeviceIdx].updatedAt = now;
      list[byDeviceIdx].isActive = true;
      if (deviceModel !== undefined) list[byDeviceIdx].deviceModel = deviceModel;
      if (deviceVersion !== undefined) list[byDeviceIdx].deviceVersion = deviceVersion;
    } else {
      list.push({
        token,
        platform,
        deviceId,
        deviceModel,
        deviceVersion,
        isActive: true,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  } else {
    list.push({
      token,
      platform,
      deviceId,
      deviceModel,
      deviceVersion,
      isActive: true,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  recipient.fcmTokens = list;
  await recipient.save();
  return { registered: true };
};

const unregisterFcmToken = async (
  recipientType,
  recipientId,
  { token, deviceId, platform } = {},
) => {
  const model = getModelByType(recipientType);

  if (!isValidObjectId(recipientId)) {
    throw new Error('Invalid recipient id');
  }

  const trimmedToken = typeof token === 'string' ? token.trim() : '';
  if (trimmedToken) {
    const result = await model.updateOne(
      { _id: recipientId },
      { $pull: { fcmTokens: { token: trimmedToken } } },
    );
    if (result.matchedCount === 0) throw new Error('Recipient not found');
    return { removed: result.modifiedCount > 0 };
  }

  const did = deviceId != null ? String(deviceId).trim() : '';
  if (did && PLATFORMS.includes(platform)) {
    const result = await model.updateOne(
      { _id: recipientId },
      { $pull: { fcmTokens: { deviceId: did, platform } } },
    );
    if (result.matchedCount === 0) throw new Error('Recipient not found');
    return { removed: result.modifiedCount > 0 };
  }

  throw new Error('Provide token, or deviceId with platform');
};

module.exports = {
  registerFcmToken,
  unregisterFcmToken,
  PLATFORMS,
  RECIPIENT_TYPES,
};
