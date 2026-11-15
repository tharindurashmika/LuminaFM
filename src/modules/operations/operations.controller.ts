import { Request, Response, NextFunction } from 'express';
import {
  operationsService,
  DailyLogEntryInput,
  CreateChecklistItemInput,
  InspectionResponseInput,
} from './operations.service';
import {
  InspectionStatus,
  ReadingQualityStatus,
  ReadingSource,
} from '@prisma/client';

export class OperationsController {
  // ===========================================================================
  // 1. CHECKLIST TEMPLATES & ITEMS
  // ===========================================================================

  async createChecklistTemplate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const code = b.code;
      const name = b.name;
      const assetCategoryId = b.assetCategoryId ?? b.asset_category_id;
      const description = b.description;
      const version = b.version;
      const isActive = b.isActive ?? b.is_active;

      if (!code || !name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'code and name are required to create a checklist template.',
          },
        });
        return;
      }

      const items: CreateChecklistItemInput[] | undefined = Array.isArray(b.items)
        ? b.items.map((item: any) => ({
            itemCode: item.itemCode ?? item.item_code,
            question: item.question,
            responseType: item.responseType ?? item.response_type,
            isRequired: item.isRequired ?? item.is_required,
            expectedValue: item.expectedValue ?? item.expected_value,
            options: item.options,
            minValue: item.minValue ?? item.min_value,
            maxValue: item.maxValue ?? item.max_value,
            unitCode: item.unitCode ?? item.unit_code,
            sequenceNo: item.sequenceNo ?? item.sequence_no,
          }))
        : undefined;

      const template = await operationsService.createChecklistTemplate({
        code,
        name,
        assetCategoryId,
        description,
        version,
        isActive,
        items,
      });

      res.status(201).json({
        success: true,
        message: 'Checklist template created successfully.',
        data: template,
      });
    } catch (err) {
      next(err);
    }
  }

  async listChecklistTemplates(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const assetCategoryId = (req.query.assetCategoryId ??
        req.query.asset_category_id) as string | undefined;
      const isActiveRaw = req.query.isActive ?? req.query.is_active;
      const isActive =
        isActiveRaw !== undefined ? String(isActiveRaw) === 'true' : undefined;

      const templates = await operationsService.listChecklistTemplates({
        assetCategoryId,
        isActive,
      });

      res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (err) {
      next(err);
    }
  }

  async getChecklistTemplateById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const template = await operationsService.getChecklistTemplateById(
        String(req.params.id)
      );
      res.status(200).json({
        success: true,
        data: template,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateChecklistTemplate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const updated = await operationsService.updateChecklistTemplate(
        String(req.params.id),
        {
          name: b.name,
          description: b.description,
          assetCategoryId: b.assetCategoryId ?? b.asset_category_id,
          isActive: b.isActive ?? b.is_active,
        }
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteChecklistTemplate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await operationsService.deleteChecklistTemplate(
        String(req.params.id)
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async addChecklistItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const checklistTemplateId =
        String(req.params.templateId || '') ||
        b.checklistTemplateId ||
        b.checklist_template_id;

      const question = b.question;
      const responseType = b.responseType ?? b.response_type;

      if (!checklistTemplateId || !question || !responseType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'checklistTemplateId, question, and responseType are required to create a checklist item.',
          },
        });
        return;
      }

      const item = await operationsService.addChecklistItem(checklistTemplateId, {
        itemCode: b.itemCode ?? b.item_code,
        question,
        responseType,
        isRequired: b.isRequired ?? b.is_required,
        expectedValue: b.expectedValue ?? b.expected_value,
        options: b.options,
        minValue: b.minValue ?? b.min_value,
        maxValue: b.maxValue ?? b.max_value,
        unitCode: b.unitCode ?? b.unit_code,
        sequenceNo: b.sequenceNo ?? b.sequence_no,
      });

      res.status(201).json({
        success: true,
        message: 'Checklist item added successfully.',
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }

  async listChecklistItems(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const templateId =
        String(req.params.templateId || '') ||
        String(req.query.checklistTemplateId || req.query.checklist_template_id || '');

      if (!templateId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'checklistTemplateId is required to list checklist items.',
          },
        });
        return;
      }

      const items = await operationsService.listChecklistItems(templateId);
      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateChecklistItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const updated = await operationsService.updateChecklistItem(
        String(req.params.id),
        {
          itemCode: b.itemCode ?? b.item_code,
          question: b.question,
          responseType: b.responseType ?? b.response_type,
          isRequired: b.isRequired ?? b.is_required,
          expectedValue: b.expectedValue ?? b.expected_value,
          options: b.options,
          minValue: b.minValue ?? b.min_value,
          maxValue: b.maxValue ?? b.max_value,
          unitCode: b.unitCode ?? b.unit_code,
          sequenceNo: b.sequenceNo ?? b.sequence_no,
        }
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteChecklistItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await operationsService.deleteChecklistItem(
        String(req.params.id)
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // ===========================================================================
  // 2. INSPECTIONS & INSPECTION RESPONSES
  // ===========================================================================

  async createInspection(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const checklistTemplateId =
        b.checklistTemplateId ?? b.checklist_template_id;

      if (!checklistTemplateId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'checklistTemplateId is required to create an inspection.',
          },
        });
        return;
      }

      const inspection = await operationsService.createInspection(
        {
          checklistTemplateId,
          assetId: b.assetId ?? b.asset_id,
          locationId: b.locationId ?? b.location_id,
          workOrderId: b.workOrderId ?? b.work_order_id,
          status: b.status,
          scheduledAt: b.scheduledAt ?? b.scheduled_at,
          startedAt: b.startedAt ?? b.started_at,
          completedAt: b.completedAt ?? b.completed_at,
          inspectorId: b.inspectorId ?? b.inspector_id,
          overallResult: b.overallResult ?? b.overall_result,
          notes: b.notes,
        },
        req.user?.userId
      );

      res.status(201).json({
        success: true,
        message: 'Inspection created successfully.',
        data: inspection,
      });
    } catch (err) {
      next(err);
    }
  }

  async listInspections(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const inspections = await operationsService.listInspections({
        assetId: (req.query.assetId ?? req.query.asset_id) as string | undefined,
        checklistTemplateId: (req.query.checklistTemplateId ??
          req.query.checklist_template_id) as string | undefined,
        status: req.query.status as InspectionStatus | undefined,
        workOrderId: (req.query.workOrderId ?? req.query.work_order_id) as
          | string
          | undefined,
      });

      res.status(200).json({
        success: true,
        data: inspections,
      });
    } catch (err) {
      next(err);
    }
  }

  async getInspectionById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const inspection = await operationsService.getInspectionById(
        String(req.params.id)
      );
      res.status(200).json({
        success: true,
        data: inspection,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateInspection(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const updated = await operationsService.updateInspection(
        String(req.params.id),
        {
          status: b.status,
          scheduledAt: b.scheduledAt ?? b.scheduled_at,
          startedAt: b.startedAt ?? b.started_at,
          completedAt: b.completedAt ?? b.completed_at,
          inspectorId: b.inspectorId ?? b.inspector_id,
          overallResult: b.overallResult ?? b.overall_result,
          notes: b.notes,
        }
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteInspection(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await operationsService.deleteInspection(
        String(req.params.id)
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async recordInspectionResponses(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const inspectionId =
        String(req.params.inspectionId || '') ||
        req.body.inspectionId ||
        req.body.inspection_id;

      if (!inspectionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'inspectionId is required to record inspection responses.',
          },
        });
        return;
      }

      const rawPayload =
        req.body.responses !== undefined ? req.body.responses : req.body;
      const rawList = Array.isArray(rawPayload) ? rawPayload : [rawPayload];

      const normalized: InspectionResponseInput[] = rawList.map((r: any) => ({
        checklistItemId: r.checklistItemId ?? r.checklist_item_id,
        itemCode: r.itemCode ?? r.item_code,
        value: r.value,
        responseText: r.responseText ?? r.response_text,
        responseNumber: r.responseNumber ?? r.response_number,
        responseBoolean: r.responseBoolean ?? r.response_boolean,
        responseDate: r.responseDate ?? r.response_date,
        responseJson: r.responseJson ?? r.response_json,
        resultStatus: r.resultStatus ?? r.result_status,
        notes: r.notes,
        evidenceUri: r.evidenceUri ?? r.evidence_uri,
      }));

      const saved = await operationsService.recordInspectionResponses(
        inspectionId,
        normalized,
        req.user?.userId
      );

      res.status(201).json({
        success: true,
        message: 'Inspection responses recorded successfully.',
        data: saved,
      });
    } catch (err) {
      next(err);
    }
  }

  async listInspectionResponses(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const inspectionId = String(req.params.inspectionId);
      const responses =
        await operationsService.listInspectionResponses(inspectionId);
      res.status(200).json({
        success: true,
        data: responses,
      });
    } catch (err) {
      next(err);
    }
  }

  // ===========================================================================
  // 3. UNITS, METER DEFINITIONS, ASSET METERS & METER READINGS
  // ===========================================================================

  async createUnitOfMeasurement(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const unitCode = b.unitCode ?? b.unit_code;
      const unitName = b.unitName ?? b.unit_name;

      if (!unitCode || !unitName) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'unitCode and unitName are required.',
          },
        });
        return;
      }

      const unit = await operationsService.createUnitOfMeasurement({
        unitCode,
        unitName,
        dimension: b.dimension,
      });

      res.status(201).json({
        success: true,
        data: unit,
      });
    } catch (err) {
      next(err);
    }
  }

  async listUnitsOfMeasurement(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const units = await operationsService.listUnitsOfMeasurement();
      res.status(200).json({
        success: true,
        data: units,
      });
    } catch (err) {
      next(err);
    }
  }

  async createMeterDefinition(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const code = b.code;
      const name = b.name;
      const unitId = b.unitId ?? b.unit_id;

      if (!code || !name || !unitId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'code, name, and unitId are required.',
          },
        });
        return;
      }

      const def = await operationsService.createMeterDefinition({
        code,
        name,
        unitId,
        readingType: b.readingType ?? b.reading_type,
        description: b.description,
      });

      res.status(201).json({
        success: true,
        data: def,
      });
    } catch (err) {
      next(err);
    }
  }

  async listMeterDefinitions(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const defs = await operationsService.listMeterDefinitions();
      res.status(200).json({
        success: true,
        data: defs,
      });
    } catch (err) {
      next(err);
    }
  }

  async createAssetMeter(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const assetId = b.assetId ?? b.asset_id;
      const meterDefinitionId = b.meterDefinitionId ?? b.meter_definition_id;

      if (!assetId || !meterDefinitionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'assetId and meterDefinitionId are required.',
          },
        });
        return;
      }

      const meter = await operationsService.createAssetMeter({
        assetId,
        meterDefinitionId,
        meterCode: b.meterCode ?? b.meter_code,
        isActive: b.isActive ?? b.is_active,
        installedAt: b.installedAt ?? b.installed_at,
      });

      res.status(201).json({
        success: true,
        data: meter,
      });
    } catch (err) {
      next(err);
    }
  }

  async listAssetMeters(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const assetId = (req.params.assetId ||
        req.query.assetId ||
        req.query.asset_id) as string | undefined;

      const meters = await operationsService.listAssetMeters(assetId);
      res.status(200).json({
        success: true,
        data: meters,
      });
    } catch (err) {
      next(err);
    }
  }

  async createMeterReading(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const assetMeterId = b.assetMeterId ?? b.asset_meter_id;
      const meterCode = b.meterCode ?? b.meter_code;
      const readingValue = b.readingValue ?? b.reading_value ?? b.value;

      if ((!assetMeterId && !meterCode) || readingValue === undefined) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'assetMeterId (or meterCode) and readingValue are required to record a meter reading.',
          },
        });
        return;
      }

      const reading = await operationsService.createMeterReading(
        {
          assetMeterId,
          meterCode,
          readingValue: Number(readingValue),
          recordedAt: b.recordedAt ?? b.recorded_at,
          source: b.source,
          qualityStatus: b.qualityStatus ?? b.quality_status,
          notes: b.notes,
        },
        req.user?.userId
      );

      res.status(201).json({
        success: true,
        message: 'Meter reading recorded successfully.',
        data: reading,
      });
    } catch (err) {
      next(err);
    }
  }

  async listMeterReadings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const readings = await operationsService.listMeterReadings({
        assetMeterId: (req.query.assetMeterId ?? req.query.asset_meter_id) as
          | string
          | undefined,
        assetId: (req.params.assetId ||
          req.query.assetId ||
          req.query.asset_id) as string | undefined,
        source: req.query.source as ReadingSource | undefined,
        qualityStatus: (req.query.qualityStatus ?? req.query.quality_status) as
          | ReadingQualityStatus
          | undefined,
      });

      res.status(200).json({
        success: true,
        data: readings,
      });
    } catch (err) {
      next(err);
    }
  }

  // ===========================================================================
  // 4. COMPOSITE DAILY LOGBOOK SUBMISSION (POST /api/operations/daily-log)
  // ===========================================================================

  async submitDailyLog(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const rawResponses = Array.isArray(b.responses) ? b.responses : [];

      const normalizedResponses: DailyLogEntryInput[] = rawResponses.map(
        (r: any) => ({
          checklistItemId: r.checklistItemId ?? r.checklist_item_id,
          itemCode: r.itemCode ?? r.item_code,
          assetMeterId: r.assetMeterId ?? r.asset_meter_id,
          meterCode: r.meterCode ?? r.meter_code,
          value: r.value,
          readingValue: r.readingValue ?? r.reading_value,
          responseText: r.responseText ?? r.response_text,
          responseNumber: r.responseNumber ?? r.response_number,
          responseBoolean: r.responseBoolean ?? r.response_boolean,
          responseDate: r.responseDate ?? r.response_date,
          responseJson: r.responseJson ?? r.response_json,
          resultStatus: r.resultStatus ?? r.result_status,
          source: r.source,
          qualityStatus: r.qualityStatus ?? r.quality_status,
          recordedAt: r.recordedAt ?? r.recorded_at,
          notes: r.notes,
          evidenceUri: r.evidenceUri ?? r.evidence_uri,
        })
      );

      const normalizedMeterReadings = Array.isArray(
        b.meterReadings ?? b.meter_readings
      )
        ? (b.meterReadings ?? b.meter_readings).map((mr: any) => ({
            assetMeterId: mr.assetMeterId ?? mr.asset_meter_id,
            meterCode: mr.meterCode ?? mr.meter_code,
            readingValue: Number(
              mr.readingValue ?? mr.reading_value ?? mr.value
            ),
            recordedAt: mr.recordedAt ?? mr.recorded_at,
            source: mr.source,
            qualityStatus: mr.qualityStatus ?? mr.quality_status,
            notes: mr.notes,
          }))
        : undefined;

      const result = await operationsService.submitDailyLog(
        {
          assetId: b.assetId ?? b.asset_id,
          locationId: b.locationId ?? b.location_id,
          workOrderId: b.workOrderId ?? b.work_order_id,
          checklistTemplateId:
            b.checklistTemplateId ?? b.checklist_template_id,
          inspectionId: b.inspectionId ?? b.inspection_id,
          shiftName: b.shiftName ?? b.shift_name,
          notes: b.notes,
          recordedAt: b.recordedAt ?? b.recorded_at,
          overallResult: b.overallResult ?? b.overall_result,
          autoDraftWorkOrder:
            b.autoDraftWorkOrder ?? b.auto_draft_work_order,
          responses: normalizedResponses,
          meterReadings: normalizedMeterReadings,
        },
        req.user?.userId
      );

      res.status(201).json({
        success: true,
        message:
          'Daily logbook shift readings recorded atomically in inspection_responses and meter_readings.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const operationsController = new OperationsController();

