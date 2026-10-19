import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AdminService } from '../services/adminService';
import { auditRepository } from '../repositories/auditRepository';
import { executeQuery } from '../database/db';
import { sendError } from '../domain/errors';

const actorName = (req: Request): string => req.user?.name || 'System';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  // --- BRANCHES ---
  public getBranches = async (req: Request, res: Response): Promise<void> => {
    try {
      const branches = await this.adminService.getBranches();
      res.json({ success: true, data: branches });
    } catch (err: any) {
      sendError(res, { sqlMessage: err.message, message: err.message });
    }
  };

  public createBranch = async (req: Request, res: Response): Promise<void> => {
    try {
      const newBranch = await this.adminService.createBranch(req.body, actorName(req));
      res.status(201).json({ success: true, data: newBranch, message: 'Branch created successfully' });
    } catch (err: any) {
      sendError(res, err);
    }
  };

  public updateBranch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updated = await this.adminService.updateBranch(id, req.body, actorName(req));
      res.json({ success: true, data: updated, message: 'Branch updated successfully' });
    } catch (err: any) {
      sendError(res, err);
    }
  };

  public toggleBranchStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updated = await this.adminService.toggleBranchStatus(id, actorName(req));
      res.json({ success: true, data: updated, message: `Branch status updated to ${updated.status}` });
    } catch (err: any) {
      sendError(res, err);
    }
  };

  public deleteBranch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.adminService.deleteBranch(id, actorName(req));
      res.json({ success: true, message: 'Branch deleted successfully' });
    } catch (err: any) {
      sendError(res, err);
    }
  };

  // --- FACILITIES ---
  public getFacilities = async (req: Request, res: Response): Promise<void> => {
    try {
      const facilities = await this.adminService.getFacilities();
      res.json({ success: true, data: facilities });
    } catch (err: any) {
      sendError(res, { sqlMessage: err.message, message: err.message });
    }
  };

  public createFacility = async (req: Request, res: Response): Promise<void> => {
    try {
      const newFacility = await this.adminService.createFacility(req.body, actorName(req));
      res.status(201).json({ success: true, data: newFacility, message: 'Facility created successfully' });
    } catch (err: any) {
      sendError(res, err);
    }
  };

  public updateFacility = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updated = await this.adminService.updateFacility(id, req.body, actorName(req));
      res.json({ success: true, data: updated, message: 'Facility updated successfully' });
    } catch (err: any) {
      sendError(res, err);
    }
  };

  public deleteFacility = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.adminService.deleteFacility(id, actorName(req));
      res.json({ success: true, message: 'Facility deleted successfully' });
    } catch (err: any) {
      sendError(res, err);
    }
  };

  // --- USERS & ROLES ---
  public getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.adminService.getUsers();
      res.json({ success: true, data: users });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  public createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const newUser = await this.adminService.createUser(req.body, actorName(req));
      res.status(201).json({ success: true, data: newUser, message: 'User created successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  public updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updated = await this.adminService.updateUser(id, req.body, actorName(req), req.user?.id);
      res.json({ success: true, data: updated, message: 'User updated successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  public toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updated = await this.adminService.toggleUserStatus(id, actorName(req), req.user?.id);
      res.json({ success: true, data: updated, message: `User status changed to ${updated.status}` });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  public getRolesPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const roles = await this.adminService.getRolesPermissions();
      res.json({ success: true, data: roles });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  public updateRolePermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { role } = req.params;
      const updated = await this.adminService.updateRolePermissions(role as any, req.body.permissions, actorName(req));
      res.json({ success: true, data: updated, message: `Permissions for role ${role} updated` });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  // --- IMPORT WIZARD ---
  public detectColumns = (req: Request, res: Response): void => {
    try {
      const { headers, sampleRows } = req.body;
      const mappings = this.adminService.autoDetectColumns(headers || [], sampleRows || []);
      res.json({ success: true, data: mappings });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  public validateImport = (req: Request, res: Response): void => {
    try {
      const { rows } = req.body;
      const errors = this.adminService.validateImportData(rows || []);
      res.json({ success: true, data: errors });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  public executeImport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { rows } = req.body;
      const result = await this.adminService.processImport(rows || []);
      res.json({ success: true, data: result, message: 'Import completed successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  // --- AUDIT LOGS ---
  public getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const logs = await auditRepository.getLogs(100);
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  // --- FILE UPLOADS ---
  public uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const actor = req.user;
      if (!actor) {
        res.status(401).json({ success: false, message: 'Authentication required.' });
        return;
      }

      const { fileName, fileType, fileSize, entityType, fileData, userId } = req.body;
      if (!fileName || !fileData) {
        res.status(400).json({ success: false, message: 'fileName and fileData are required' });
        return;
      }

      // Authorization checks
      const isDirectorOrAdmin = actor.role === 'Director' || actor.permissions?.administration === true || actor.permissions?.settings === true;
      if (entityType === 'logo' || entityType === 'company_logo' || entityType === 'director_photo') {
        if (!isDirectorOrAdmin) {
          res.status(403).json({ success: false, message: 'Only administrators and directors can update business branding or director photos.' });
          return;
        }
      }

      const targetUserId = userId || actor.id;
      if ((entityType === 'profile_photo' || entityType === 'avatar' || entityType === 'director_photo') && targetUserId !== actor.id) {
        if (!isDirectorOrAdmin) {
          res.status(403).json({ success: false, message: "You do not have permission to change another user's profile picture." });
          return;
        }
      }

      // Validate base64 payload
      if (typeof fileData !== 'string' || !fileData.startsWith('data:')) {
        res.status(400).json({ success: false, message: 'Invalid file data encoding.' });
        return;
      }

      const matches = fileData.match(/^data:([A-Za-z0-9\/\+\-\.]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        res.status(400).json({ success: false, message: 'Invalid data URI format.' });
        return;
      }

      const declaredMime = matches[1].toLowerCase();
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Size validation (Max 5MB)
      const MAX_BYTES = 5 * 1024 * 1024;
      if (buffer.length > MAX_BYTES || (fileSize && Number(fileSize) > MAX_BYTES)) {
        res.status(400).json({ success: false, message: 'File size exceeds the 5MB limit. Please upload a smaller image.' });
        return;
      }

      // Magic bytes & format validation
      let confirmedExt = '';
      const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      const isJpeg = buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
      const isWebp = buffer.length > 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
      const textPreview = buffer.subarray(0, Math.min(buffer.length, 1024)).toString('utf-8').trim().toLowerCase();
      const isSvg = declaredMime.includes('svg') || textPreview.includes('<svg');

      if (isPng) {
        confirmedExt = 'png';
      } else if (isJpeg) {
        confirmedExt = 'jpg';
      } else if (isWebp) {
        confirmedExt = 'webp';
      } else if (isSvg) {
        // Sanitize SVG: reject active scripts or handlers
        const fullSvg = buffer.toString('utf-8');
        const dangerousPatterns = [
          /<script/i,
          /onload\s*=/i,
          /onerror\s*=/i,
          /onclick\s*=/i,
          /javascript\s*:/i,
          /<iframe/i,
          /<object/i,
          /<embed/i,
          /<foreignObject/i,
        ];
        if (dangerousPatterns.some((p) => p.test(fullSvg))) {
          res.status(400).json({ success: false, message: 'Unsafe SVG content detected. Scripts and event handlers are prohibited.' });
          return;
        }
        confirmedExt = 'svg';
      } else {
        res.status(400).json({ success: false, message: 'Unsupported image format. Allowed formats are PNG, JPEG, WebP, and clean SVG.' });
        return;
      }

      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const safeBaseName = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 50);
      const uniqueFileName = `${entityType}_${Date.now()}_${safeBaseName}.${confirmedExt}`;
      const filePathOnDisk = path.join(uploadsDir, uniqueFileName);

      fs.writeFileSync(filePathOnDisk, buffer);
      const savedUrl = `/uploads/${uniqueFileName}`;

      await executeQuery(
        `INSERT INTO file_uploads (file_name, file_path, file_type, file_size, entity_type) VALUES (?, ?, ?, ?, ?)`,
        [fileName, savedUrl, fileType || `image/${confirmedExt}`, buffer.length, entityType || 'logo']
      );

      // Persist to business_settings / users
      if (entityType === 'logo' || entityType === 'company_logo') {
        await executeQuery(`UPDATE business_settings SET business_logo = ? WHERE id = 1`, [savedUrl]);
      } else if (entityType === 'director_photo') {
        await executeQuery(`UPDATE business_settings SET director_photo = ? WHERE id = 1`, [savedUrl]);
        await executeQuery(`UPDATE users SET profile_photo = ? WHERE role = 'Director' OR id = 'USR-001'`, [savedUrl]);
        await executeQuery(`UPDATE profile_settings SET profile_photo = ? WHERE user_id = 'USR-001'`, [savedUrl]);
      } else if (entityType === 'profile_photo' || entityType === 'avatar' || entityType === 'user_avatar') {
        await executeQuery(`UPDATE users SET profile_photo = ? WHERE id = ?`, [savedUrl, targetUserId]);
        await executeQuery(`UPDATE profile_settings SET profile_photo = ? WHERE user_id = ?`, [savedUrl, targetUserId]);
        if (targetUserId === actor.id && actor.role === 'Director') {
          await executeQuery(`UPDATE business_settings SET director_photo = ? WHERE id = 1`, [savedUrl]);
        }
      }

      auditRepository.logAction({
        user: actor.name,
        action: 'UPLOAD_FILE',
        entity: entityType || 'uploads',
        entityId: uniqueFileName,
        newValue: { fileName, url: savedUrl, entityType, targetUserId },
      });

      res.status(201).json({
        success: true,
        message: 'File uploaded and saved successfully',
        data: { fileName, fileType: `image/${confirmedExt}`, fileSize: buffer.length, entityType, url: savedUrl },
      });
    } catch (err: any) {
      console.error('Error uploading file:', err);
      res.status(500).json({ success: false, message: err.message || 'File upload failed' });
    }
  };
}
