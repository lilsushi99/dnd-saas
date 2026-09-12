import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AdminService } from '../services/adminService';
import { auditRepository } from '../repositories/auditRepository';
import { executeQuery } from '../database/db';

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
      res.status(500).json({ success: false, message: err.message });
    }
  };

  public createBranch = async (req: Request, res: Response): Promise<void> => {
    try {
      const newBranch = await this.adminService.createBranch(req.body);
      res.status(201).json({ success: true, data: newBranch, message: 'Branch created successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  public updateBranch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updated = await this.adminService.updateBranch(id, req.body);
      res.json({ success: true, data: updated, message: 'Branch updated successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  public toggleBranchStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updated = await this.adminService.toggleBranchStatus(id);
      res.json({ success: true, data: updated, message: `Branch status updated to ${updated.status}` });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  // --- FACILITIES ---
  public getFacilities = async (req: Request, res: Response): Promise<void> => {
    try {
      const facilities = await this.adminService.getFacilities();
      res.json({ success: true, data: facilities });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  public createFacility = async (req: Request, res: Response): Promise<void> => {
    try {
      const newFacility = await this.adminService.createFacility(req.body);
      res.status(201).json({ success: true, data: newFacility, message: 'Facility created successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  public updateFacility = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updated = await this.adminService.updateFacility(id, req.body);
      res.json({ success: true, data: updated, message: 'Facility updated successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  public deleteFacility = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.adminService.deleteFacility(id);
      res.json({ success: true, message: 'Facility deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
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
      const newUser = await this.adminService.createUser(req.body);
      res.status(201).json({ success: true, data: newUser, message: 'User created successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  public updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updated = await this.adminService.updateUser(id, req.body);
      res.json({ success: true, data: updated, message: 'User updated successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  public toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updated = await this.adminService.toggleUserStatus(id);
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
      const updated = await this.adminService.updateRolePermissions(role as any, req.body.permissions);
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
      const { fileName, fileType, fileSize, entityType, fileData } = req.body;
      if (!fileName || !fileData) {
        res.status(400).json({ success: false, message: 'fileName and fileData are required' });
        return;
      }

      let savedUrl = fileData;

      if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');

          const ext = mimeType.split('/')[1] || 'png';
          const sanitizedName = fileName.replace(/[^a-zA-Z0-9_\.-]/g, '_');
          const uniqueFileName = `${Date.now()}_${sanitizedName}`;
          const uploadsDir = path.join(process.cwd(), 'uploads');

          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          const filePathOnDisk = path.join(uploadsDir, uniqueFileName);
          fs.writeFileSync(filePathOnDisk, buffer);

          savedUrl = `/uploads/${uniqueFileName}`;
        }
      }

      await executeQuery(
        `INSERT INTO file_uploads (file_name, file_path, file_type, file_size, entity_type) VALUES (?, ?, ?, ?, ?)`,
        [fileName, savedUrl, fileType || 'image/png', fileSize || 0, entityType || 'logo']
      );

      // Persist to business_settings / users if logo or profile photo
      if (entityType === 'logo' || entityType === 'company_logo') {
        await executeQuery(`UPDATE business_settings SET business_logo = ? WHERE id = 1`, [savedUrl]);
      } else if (entityType === 'profile_photo' || entityType === 'avatar' || entityType === 'user_avatar') {
        await executeQuery(`UPDATE business_settings SET profile_photo = ? WHERE id = 1`, [savedUrl]);
        await executeQuery(`UPDATE users SET profile_photo = ? WHERE role = 'Director' OR id = 'USR-001'`, [savedUrl]);
      }

      res.status(201).json({
        success: true,
        message: 'File uploaded and saved to MySQL successfully',
        data: { fileName, fileType, fileSize, entityType, url: savedUrl },
      });
    } catch (err: any) {
      console.error('Error uploading file:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  };
}
