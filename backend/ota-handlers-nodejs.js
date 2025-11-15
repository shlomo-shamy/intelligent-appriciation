/**
 * OTA Handlers for Vanilla Node.js HTTP Server
 * Adapted for your existing server.js structure
 */

const multer = require('multer');
const crypto = require('crypto');
const { getStorage } = require('firebase-admin/storage');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.bin')) {
      cb(null, true);
    } else {
      cb(new Error('Only .bin firmware files are allowed'));
    }
  }
});

// Calculate SHA256 checksum
function calculateChecksum(buffer) {
  const hashSum = crypto.createHash('sha256');
  hashSum.update(buffer);
  return hashSum.digest('hex');
}

// Helper to get Realtime Database reference
function getRealtimeDB(admin) {
  return admin.database();
}

/**
 * POST /api/firmware/upload
 * Upload firmware to Firebase Storage
 */
async function handleFirmwareUpload(req, res, body, session, admin) {
  try {
    // Check admin access
    if (session.userLevel < 2) { // Require admin (level 2)
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    // This is tricky with vanilla Node.js - multer expects Express
    // We'll handle file upload manually
    const boundary = req.headers['content-type']?.split('boundary=')[1];
    if (!boundary) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid multipart request' }));
      return;
    }

    // Parse multipart data (simplified - in production use a proper parser)
    const parts = body.toString().split(`--${boundary}`);
    let firmwareBuffer = null;
    let version = null;
    let changelog = '';
    let hardwareVersion = 'all';
    let required = false;

    for (const part of parts) {
      if (part.includes('name="firmware"')) {
        // Extract binary data
        const binaryStart = part.indexOf('\r\n\r\n') + 4;
        const binaryEnd = part.lastIndexOf('\r\n');
        firmwareBuffer = Buffer.from(part.substring(binaryStart, binaryEnd), 'binary');
      } else if (part.includes('name="version"')) {
        version = part.split('\r\n\r\n')[1]?.trim();
      } else if (part.includes('name="changelog"')) {
        changelog = part.split('\r\n\r\n')[1]?.trim() || '';
      } else if (part.includes('name="hardware_version"')) {
        hardwareVersion = part.split('\r\n\r\n')[1]?.trim() || 'all';
      } else if (part.includes('name="required"')) {
        const reqValue = part.split('\r\n\r\n')[1]?.trim();
        required = reqValue === 'true' || reqValue === 'on';
      }
    }

    if (!firmwareBuffer || !version) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Firmware file and version required' }));
      return;
    }

    // Check if version exists
    const db = getRealtimeDB(admin);
    const firmwareRef = db.ref(`firmware/versions/${version}`);
    const snapshot = await firmwareRef.once('value');
    
    if (snapshot.exists()) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Firmware version already exists' }));
      return;
    }

    // Calculate checksum
    const checksum = calculateChecksum(firmwareBuffer);
    const fileSize = firmwareBuffer.length;

    // Upload to Firebase Storage
    const timestamp = Date.now();
    const filename = `firmware_v${version}_${timestamp}.bin`;
    const storagePath = `firmware/${filename}`;

    const bucket = getStorage().bucket();
    const file = bucket.file(storagePath);

    await file.save(firmwareBuffer, {
      metadata: {
        contentType: 'application/octet-stream',
        metadata: {
          version: version,
          checksum: checksum,
          uploadedBy: session.email,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Make file publicly accessible
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Store metadata in Realtime Database
    const firmwareData = {
      version: version,
      filename: filename,
      storage_path: storagePath,
      size: fileSize,
      checksum: checksum,
      uploaded_at: Date.now(),
      uploaded_by: session.email,
      changelog: changelog,
      hardware_version: hardwareVersion,
      required: required,
      download_url: publicUrl,
      active: true
    };

    await firmwareRef.set(firmwareData);

    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: 'Firmware uploaded successfully',
      firmware: firmwareData
    }));

  } catch (error) {
    console.error('Firmware upload error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Upload failed', details: error.message }));
  }
}

/**
 * GET /api/firmware/versions
 * List all firmware versions
 */
async function handleFirmwareVersionsList(req, res, session, admin) {
  try {
    if (session.userLevel < 2) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    const db = getRealtimeDB(admin);
    const firmwareRef = db.ref('firmware/versions');
    const snapshot = await firmwareRef.once('value');
    
    const versions = [];
    snapshot.forEach((childSnapshot) => {
      versions.push({
        version: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    // Sort by upload date, newest first
    versions.sort((a, b) => (b.uploaded_at || 0) - (a.uploaded_at || 0));

    res.writeHead(200);
    res.end(JSON.stringify({ versions }));

  } catch (error) {
    console.error('Error fetching versions:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Failed to fetch versions' }));
  }
}

/**
 * GET /api/firmware/download/:version
 * Download or redirect to firmware
 */
async function handleFirmwareDownload(req, res, version, admin) {
  try {
    const db = getRealtimeDB(admin);
    const firmwareRef = db.ref(`firmware/versions/${version}`);
    const snapshot = await firmwareRef.once('value');

    if (!snapshot.exists()) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Firmware version not found' }));
      return;
    }

    const firmwareData = snapshot.val();

    // Redirect to public URL
    res.writeHead(302, { 'Location': firmwareData.download_url });
    res.end();

  } catch (error) {
    console.error('Download error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Download failed' }));
  }
}

/**
 * DELETE /api/firmware/:version
 * Delete firmware version
 */
async function handleFirmwareDelete(req, res, version, session, admin) {
  try {
    if (session.userLevel < 2) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    const db = getRealtimeDB(admin);
    const firmwareRef = db.ref(`firmware/versions/${version}`);
    const snapshot = await firmwareRef.once('value');

    if (!snapshot.exists()) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Firmware version not found' }));
      return;
    }

    const firmwareData = snapshot.val();

    // Delete from Storage
    try {
      const bucket = getStorage().bucket();
      const file = bucket.file(firmwareData.storage_path);
      await file.delete();
    } catch (storageError) {
      console.warn('File not found in storage:', storageError);
    }

    // Delete from database
    await firmwareRef.remove();

    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Firmware deleted' }));

  } catch (error) {
    console.error('Delete error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Delete failed' }));
  }
}

/**
 * GET /api/firmware/latest
 * Get latest firmware (for ESP32)
 */
async function handleFirmwareLatest(req, res, admin) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const hardwareVersion = url.searchParams.get('hardware_version');
    const currentVersion = url.searchParams.get('current_version');

    const db = getRealtimeDB(admin);
    const firmwareRef = db.ref('firmware/versions');
    const snapshot = await firmwareRef.orderByChild('uploaded_at').once('value');

    let latestFirmware = null;
    let latestTimestamp = 0;

    snapshot.forEach((childSnapshot) => {
      const firmware = childSnapshot.val();
      
      if (hardwareVersion && firmware.hardware_version !== 'all' && 
          firmware.hardware_version !== hardwareVersion) {
        return;
      }

      if (firmware.active && firmware.uploaded_at > latestTimestamp) {
        latestTimestamp = firmware.uploaded_at;
        latestFirmware = {
          version: childSnapshot.key,
          ...firmware
        };
      }
    });

    if (!latestFirmware) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'No firmware available' }));
      return;
    }

    const updateAvailable = currentVersion ? 
      latestFirmware.version !== currentVersion : true;

    res.writeHead(200);
    res.end(JSON.stringify({
      version: latestFirmware.version,
      size: latestFirmware.size,
      checksum: latestFirmware.checksum,
      download_url: latestFirmware.download_url,
      changelog: latestFirmware.changelog,
      required: latestFirmware.required,
      update_available: updateAvailable,
      current_version: currentVersion || 'unknown'
    }));

  } catch (error) {
    console.error('Error fetching latest:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Failed to fetch latest firmware' }));
  }
}

/**
 * POST /api/ota/trigger
 * Trigger OTA update for devices
 */
async function handleOTATrigger(req, res, body, session, admin) {
  try {
    if (session.userLevel < 2) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    const data = JSON.parse(body);
    const { 
      target_version, 
      device_serials,
      organization_id,
      maintenance_window 
    } = data;

    if (!target_version) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Target version required' }));
      return;
    }

    const db = getRealtimeDB(admin);
    
    // Validate firmware exists
    const firmwareRef = db.ref(`firmware/versions/${target_version}`);
    const firmwareSnapshot = await firmwareRef.once('value');

    if (!firmwareSnapshot.exists()) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Firmware version not found' }));
      return;
    }

    const firmwareData = firmwareSnapshot.val();

    // Determine target devices
    let targetDevices = [];
    if (device_serials && device_serials.length > 0) {
      targetDevices = device_serials;
    } else if (organization_id) {
      // Get devices from organization
      const devicesRef = db.ref('devices');
      const devicesSnapshot = await devicesRef
        .orderByChild('organization_id')
        .equalTo(organization_id)
        .once('value');

      devicesSnapshot.forEach((childSnapshot) => {
        targetDevices.push(childSnapshot.key);
      });
    } else {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Must specify device_serials or organization_id' }));
      return;
    }

    if (targetDevices.length === 0) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'No devices found' }));
      return;
    }

    // Create OTA commands
    const updates = {};
    const rolloutId = `rollout_${Date.now()}`;

    for (const serial of targetDevices) {
      const deviceOtaPath = `devices/${serial}/ota`;
      
      updates[`${deviceOtaPath}/command`] = 'update';
      updates[`${deviceOtaPath}/target_version`] = target_version;
      updates[`${deviceOtaPath}/download_url`] = firmwareData.download_url;
      updates[`${deviceOtaPath}/checksum`] = firmwareData.checksum;
      updates[`${deviceOtaPath}/size`] = firmwareData.size;
      updates[`${deviceOtaPath}/status`] = 'pending';
      updates[`${deviceOtaPath}/progress`] = 0;
      updates[`${deviceOtaPath}/triggered_at`] = Date.now();
      updates[`${deviceOtaPath}/triggered_by`] = session.email;
      updates[`${deviceOtaPath}/rollout_id`] = rolloutId;
      updates[`${deviceOtaPath}/error`] = null;
      
      if (maintenance_window) {
        updates[`${deviceOtaPath}/maintenance_window`] = maintenance_window;
      }
    }

    // Store rollout metadata
    const rolloutPath = `ota/rollouts/${rolloutId}`;
    updates[rolloutPath] = {
      version: target_version,
      device_count: targetDevices.length,
      devices: targetDevices,
      organization_id: organization_id || null,
      triggered_at: Date.now(),
      triggered_by: session.email,
      maintenance_window: maintenance_window || null,
      status: 'in_progress'
    };

    await db.ref().update(updates);

    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: `OTA triggered for ${targetDevices.length} device(s)`,
      rollout_id: rolloutId,
      target_version: target_version,
      device_count: targetDevices.length,
      devices: targetDevices
    }));

  } catch (error) {
    console.error('OTA trigger error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Failed to trigger OTA' }));
  }
}

module.exports = {
  handleFirmwareUpload,
  handleFirmwareVersionsList,
  handleFirmwareDownload,
  handleFirmwareDelete,
  handleFirmwareLatest,
  handleOTATrigger
};
